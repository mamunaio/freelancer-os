"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

import {
  ACCENT_PRESETS,
  deriveGlow,
  formatHsl,
  hexFromHslString,
  hslStringFromHex,
  parseHsl,
} from "@/lib/color/hsl";
import { updateWorkspaceAction } from "@/features/workspace/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection } from "./settings-section";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  initial: {
    name: string;
    tagline: string;
    logoUrl: string;
    accentHsl: string;
    baseCurrency: "USD" | "BDT";
    taxRate: number;
  };
}

const DEFAULT_ACCENT = "226 100% 65%";

/**
 * Workspace settings form.
 *
 * - Live previews accent change immediately by writing CSS vars on the root
 *   element (no save needed). On successful save, server revalidates so it
 *   persists; on cancel, navigate away to revert from the layout's stored
 *   accent.
 * - Hex picker syncs both ways with the HSL string field.
 * - Submit button enables only when something changed.
 */
export function WorkspaceForm({ locale, initial }: Props) {
  const t = useTranslations("Settings.workspace");
  const router = useRouter();

  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [accentHsl, setAccentHsl] = useState(initial.accentHsl);
  const [baseCurrency, setBaseCurrency] = useState<"USD" | "BDT">(
    initial.baseCurrency,
  );
  const [taxRate, setTaxRate] = useState<string>(String(initial.taxRate));

  const [isPending, startTransition] = useTransition();

  // Live accent preview — writes CSS vars on the document root whenever the
  // form's accent changes. Persists on save; otherwise the next navigation
  // reverts to the stored value via the layout-level provider.
  useEffect(() => {
    const parsed = parseHsl(accentHsl);
    if (!parsed) return;
    const glow = deriveGlow(parsed);
    const root = document.documentElement;
    const accent = formatHsl(parsed);
    const glowStr = formatHsl(glow);

    root.style.setProperty("--primary", accent);
    root.style.setProperty("--ring", accent);
    root.style.setProperty("--sidebar-primary", accent);
    root.style.setProperty("--sidebar-ring", accent);
    root.style.setProperty("--primary-glow", glowStr);
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, hsl(${accent}) 0%, hsl(${glowStr}) 100%)`,
    );
    root.style.setProperty(
      "--shadow-glow",
      `0 8px 32px -8px hsl(${accent} / 0.4)`,
    );
  }, [accentHsl]);

  const dirty =
    name !== initial.name ||
    tagline !== initial.tagline ||
    logoUrl !== initial.logoUrl ||
    accentHsl !== initial.accentHsl ||
    baseCurrency !== initial.baseCurrency ||
    Number(taxRate) !== initial.taxRate;

  const accentValid = parseHsl(accentHsl) !== null;
  const hexValue = hexFromHslString(accentHsl) ?? "#000000";

  function onHexChange(hex: string) {
    const next = hslStringFromHex(hex);
    if (next) setAccentHsl(next);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) {
      toast.info(t("noChanges"));
      return;
    }
    if (!accentValid) {
      toast.error(t("field.accentCustomHint"));
      return;
    }

    startTransition(async () => {
      const taxNum = Number(taxRate);
      const result = await updateWorkspaceAction(
        {
          name: name.trim(),
          tagline: tagline.trim(),
          logoUrl: logoUrl.trim(),
          accentHsl,
          baseCurrency,
          taxRate: Number.isFinite(taxNum) ? taxNum : 0,
        },
        locale,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <header className="pb-2">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          {t("subtitle")}
        </p>
      </header>

      {/* Identity */}
      <SettingsSection title={t("section.identity")} description={t("section.identityHint")}>
        <div className="space-y-1.5">
          <Label htmlFor="ws-name">{t("field.name")}</Label>
          <Input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-tagline">{t("field.tagline")}</Label>
          <Input
            id="ws-tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={160}
            placeholder={t("field.taglinePlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ws-logo">{t("field.logo")}</Label>
          <Input
            id="ws-logo"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
          />
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {t("field.logoHint")}
          </p>
        </div>
      </SettingsSection>

      {/* Brand */}
      <SettingsSection
        title={t("section.brand")}
        description={t("section.brandHint")}
        action={
          accentHsl !== DEFAULT_ACCENT && (
            <button
              type="button"
              onClick={() => setAccentHsl(DEFAULT_ACCENT)}
              className="inline-flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            >
              <RefreshCw className="h-3 w-3" />
              {t("resetAccent")}
            </button>
          )
        }
      >
        {/* Presets */}
        <div className="space-y-2">
          <Label>{t("preset")}</Label>
          <div className="flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((p) => {
              const active = p.hsl === accentHsl;
              return (
                <button
                  key={p.hsl}
                  type="button"
                  onClick={() => setAccentHsl(p.hsl)}
                  className="group relative h-8 w-8 rounded-full border border-[hsl(var(--border))] transition-transform hover:scale-110 focus-ring"
                  style={{ backgroundColor: `hsl(${p.hsl})` }}
                  title={p.label}
                  aria-pressed={active}
                >
                  {active && (
                    <span className="absolute inset-0 rounded-full ring-2 ring-[hsl(var(--foreground))] ring-offset-2 ring-offset-[hsl(var(--background))]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom HSL + Hex */}
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <div className="space-y-1.5">
            <Label htmlFor="ws-accent">{t("field.accentCustom")}</Label>
            <Input
              id="ws-accent"
              value={accentHsl}
              onChange={(e) => setAccentHsl(e.target.value)}
              className="font-mono"
              placeholder="226 100% 65%"
            />
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
              {t("field.accentCustomHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-hex">{t("field.accentHex")}</Label>
            <div className="flex h-9 items-center gap-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] pl-1.5 pr-2.5">
              <input
                id="ws-hex"
                type="color"
                value={hexValue}
                onChange={(e) => onHexChange(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
              />
              <span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">
                {hexValue.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Live preview chips */}
        <div className="space-y-2">
          <Label>{t("preview")}</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="h-9 rounded-md bg-[image:var(--gradient-primary)] px-3 text-xs font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)]"
            >
              Primary button
            </button>
            <span className="flex h-9 items-center rounded-md border border-[hsl(var(--primary))]/30 bg-[hsl(var(--primary))]/10 px-3 text-xs font-medium text-[hsl(var(--primary))]">
              Tinted chip
            </span>
            <span className="gradient-text font-display text-2xl font-bold">
              v2
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* Money */}
      <SettingsSection title={t("section.money")} description={t("section.moneyHint")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ws-currency">{t("field.baseCurrency")}</Label>
            <Select
              value={baseCurrency}
              onValueChange={(v) => setBaseCurrency(v as "USD" | "BDT")}
            >
              <SelectTrigger id="ws-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD · US Dollar</SelectItem>
                <SelectItem value="BDT">BDT · Bangladeshi Taka</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-tax">{t("field.taxRate")}</Label>
            <Input
              id="ws-tax"
              type="number"
              step="0.1"
              min={0}
              max={100}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Save bar */}
      <div className="sticky bottom-4 z-10 flex justify-end border-t border-[hsl(var(--border))] pt-4">
        <button
          type="submit"
          disabled={!dirty || isPending}
          className="flex h-10 items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] shadow-[var(--shadow-glow)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("save")}
        </button>
      </div>
    </form>
  );
}
