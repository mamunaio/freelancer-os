"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, Moon, Monitor, Sun } from "lucide-react";

import { updateProfileAction } from "@/features/profile/actions";
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { useRouter as useLocaleRouter, usePathname } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "./settings-section";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  initial: {
    name: string;
    email: string;
    image: string;
    locale: Locale;
    themeMode: ThemePreference;
  };
}

/**
 * Identity + preferences form.
 *
 * Locale change → switch URL prefix using the locale router so the new
 * language reflects immediately.
 * Theme change → applies via ThemeProvider live, then persists on save.
 */
export function ProfileForm({ locale, initial }: Props) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const localeRouter = useLocaleRouter();
  const pathname = usePathname();
  const { preference, setPreference } = useTheme();

  const [name, setName] = useState(initial.name);
  const [image, setImage] = useState(initial.image);
  const [chosenLocale, setChosenLocale] = useState<Locale>(initial.locale);
  // Use the live theme preference so changes here mirror the header toggle.
  const themeMode: ThemePreference = preference;

  const [isPending, startTransition] = useTransition();

  const dirty =
    name !== initial.name ||
    image !== initial.image ||
    chosenLocale !== initial.locale ||
    themeMode !== initial.themeMode;

  function setThemeAndPersistLater(next: ThemePreference) {
    setPreference(next);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) {
      toast.info(t("noChanges"));
      return;
    }

    startTransition(async () => {
      const result = await updateProfileAction(
        {
          name: name.trim(),
          image: image.trim(),
          locale: chosenLocale,
          themeMode,
        },
        locale,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("saved"));

      if (chosenLocale !== locale) {
        localeRouter.replace(pathname, {
          locale: chosenLocale,
          scroll: false,
        });
      } else {
        router.refresh();
      }
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

      {/* Personal info */}
      <SettingsSection
        title={t("section.personal")}
        description={t("section.personalHint")}
      >
        <div className="space-y-1.5">
          <Label htmlFor="pf-name">{t("field.name")}</Label>
          <Input
            id="pf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-email">{t("field.email")}</Label>
          <Input
            id="pf-email"
            value={initial.email}
            disabled
            className="opacity-70"
          />
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {t("field.emailHint")}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-image">{t("field.image")}</Label>
          <Input
            id="pf-image"
            type="url"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://…"
          />
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {t("field.imageHint")}
          </p>
        </div>
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection
        title={t("section.preferences")}
        description={t("section.preferencesHint")}
      >
        <div className="space-y-2">
          <Label>{t("field.language")}</Label>
          <div className="flex gap-2">
            <LangChip
              active={chosenLocale === "en"}
              onClick={() => setChosenLocale("en")}
            >
              English
            </LangChip>
            <LangChip
              active={chosenLocale === "bn"}
              onClick={() => setChosenLocale("bn")}
            >
              বাংলা
            </LangChip>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("field.theme")}</Label>
          <div className="grid grid-cols-3 gap-2">
            <ThemeCard
              active={themeMode === "dark"}
              onClick={() => setThemeAndPersistLater("dark")}
              icon={<Moon className="h-4 w-4" />}
              label={t("field.themeDark")}
            />
            <ThemeCard
              active={themeMode === "light"}
              onClick={() => setThemeAndPersistLater("light")}
              icon={<Sun className="h-4 w-4" />}
              label={t("field.themeLight")}
            />
            <ThemeCard
              active={themeMode === "system"}
              onClick={() => setThemeAndPersistLater("system")}
              icon={<Monitor className="h-4 w-4" />}
              label={t("field.themeSystem")}
            />
          </div>
        </div>
      </SettingsSection>

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

function LangChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "h-9 rounded-md border px-3 text-sm transition-colors focus-ring",
        active
          ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/10 text-[hsl(var(--foreground))] font-medium"
          : "border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
      )}
    >
      {children}
    </button>
  );
}

function ThemeCard({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-20 flex-col items-start justify-between rounded-lg border p-3 text-left transition-colors focus-ring",
        active
          ? "border-[hsl(var(--primary))]/50 bg-[hsl(var(--primary))]/8"
          : "border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] hover:bg-[hsl(var(--surface-2))]",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md",
          active
            ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]"
            : "bg-[hsl(var(--surface-2))] text-[hsl(var(--muted-foreground))]",
        )}
      >
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
