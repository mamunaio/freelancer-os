import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Loader2, Upload, Trash2, Sparkles, Sun, Moon, Check, Receipt } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCENT_PRESETS: { label: string; hsl: string }[] = [
  { label: "Electric", hsl: "226 100% 65%" },
  { label: "Aurora", hsl: "265 90% 65%" },
  { label: "Sunset", hsl: "16 95% 60%" },
  { label: "Lime", hsl: "152 76% 50%" },
  { label: "Cyan", hsl: "190 90% 55%" },
  { label: "Rose", hsl: "340 90% 60%" },
  { label: "Amber", hsl: "38 95% 55%" },
  { label: "Slate", hsl: "215 25% 55%" },
];

const hslToHex = (hsl: string): string => {
  const [hStr, sStr, lStr] = hsl.trim().split(/\s+/);
  const h = parseFloat(hStr) / 360;
  const s = parseFloat(sStr) / 100;
  const l = parseFloat(lStr) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHsl = (hex: string): string => {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return "226 100% 65%";
  const r = parseInt(m[0], 16) / 255;
  const g = parseInt(m[1], 16) / 255;
  const b = parseInt(m[2], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const SettingsPage = () => {
  const { settings, refresh, isLoading } = useWorkspace();
  const { mode, toggle, setMode } = useTheme();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [accent, setAccent] = useState("226 100% 65%");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState<string>("25");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setName(settings.name);
      setTagline(settings.tagline ?? "");
      setAccent(settings.accent_hsl);
      setLogoUrl(settings.logo_url);
      setTaxRate(String(settings.tax_rate ?? 25));
    }
  }, [settings]);

  // Live-preview accent while picking
  useEffect(() => {
    if (!accent) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", accent);
    root.style.setProperty("--ring", accent);
    root.style.setProperty("--sidebar-primary", accent);
    root.style.setProperty("--sidebar-ring", accent);
  }, [accent]);

  const save = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error("Settings not loaded yet");
      const parsedRate = Number(taxRate);
      const { error } = await supabase
        .from("workspace_settings")
        .update({
          name: name.trim() || "Workspace",
          tagline: tagline.trim() || null,
          accent_hsl: accent,
          logo_url: logoUrl,
          tax_rate: Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : 25,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workspace updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onLogoChange = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("workspace-assets")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("workspace-assets").getPublicUrl(path);
      setLogoUrl(pub.publicUrl);
      toast.success("Logo uploaded — remember to save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    setLogoUrl(null);
    toast.info("Logo removed — remember to save");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        eyebrow="Configuration"
        title="Workspace settings"
        subtitle="Brand the OS — name, tagline, logo, accent, and theme."
        actions={
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate()}
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save changes
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Identity */}
        <GlassCard>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold">Identity</p>
              <p className="text-[11px] text-muted-foreground">How the workspace shows up everywhere</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ws-name">Workspace name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Studio"
                className="border-border/60 bg-secondary/40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ws-tagline">Tagline</Label>
              <Textarea
                id="ws-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                rows={2}
                placeholder="Cinematic productivity for solo founders"
                className="border-border/60 bg-secondary/40"
              />
            </div>
          </div>
        </GlassCard>

        {/* Logo */}
        <GlassCard>
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-secondary/40">
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold">Logo</p>
              <p className="text-[11px] text-muted-foreground">PNG/SVG · under 2MB</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-secondary/40">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onLogoChange(e.target.files[0])}
                />
                <span className="inline-flex h-9 w-fit items-center gap-1.5 rounded-md border border-border/60 bg-secondary/40 px-3 text-xs font-medium transition-colors hover:bg-secondary">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : logoUrl ? "Replace" : "Upload"}
                </span>
              </label>
              {logoUrl && (
                <button
                  onClick={removeLogo}
                  className="inline-flex w-fit items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Accent */}
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg shadow-glow"
              style={{ background: `hsl(${accent})` }}
            />
            <div>
              <p className="font-display text-sm font-semibold">Accent color</p>
              <p className="text-[11px] text-muted-foreground">Updates buttons, highlights, and the gradient logo mark globally</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr,auto]">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {ACCENT_PRESETS.map((p) => {
                const active = accent === p.hsl;
                return (
                  <button
                    key={p.hsl}
                    onClick={() => setAccent(p.hsl)}
                    className={cn(
                      "group relative flex aspect-square items-center justify-center rounded-xl border transition-all",
                      active
                        ? "border-foreground/60 ring-2 ring-foreground/20"
                        : "border-border/60 hover:scale-105",
                    )}
                    style={{ background: `hsl(${p.hsl})` }}
                    title={p.label}
                  >
                    {active && <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-end gap-2">
              <div className="grid gap-1.5">
                <Label className="text-[11px]">Custom</Label>
                <input
                  type="color"
                  value={hslToHex(accent)}
                  onChange={(e) => setAccent(hexToHsl(e.target.value))}
                  className="h-10 w-16 cursor-pointer rounded-md border border-border/60 bg-secondary/40"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px]">HSL</Label>
                <Input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-10 w-44 border-border/60 bg-secondary/40 font-mono text-xs"
                  placeholder="226 100% 65%"
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Theme */}
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-secondary/40">
              {mode === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </div>
            <div>
              <p className="font-display text-sm font-semibold">Appearance</p>
              <p className="text-[11px] text-muted-foreground">Switch between cinematic dark and clean light mode</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("dark")}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-4 text-left transition-all",
                mode === "dark"
                  ? "border-primary/60 ring-2 ring-primary/20"
                  : "border-border/60 hover:border-border",
              )}
            >
              <div className="mb-3 h-20 rounded-lg bg-gradient-to-br from-[hsl(230,25%,8%)] to-[hsl(230,25%,3%)]" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Dark</span>
                <Moon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Cinematic — recommended</p>
            </button>
            <button
              onClick={() => setMode("light")}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-4 text-left transition-all",
                mode === "light"
                  ? "border-primary/60 ring-2 ring-primary/20"
                  : "border-border/60 hover:border-border",
              )}
            >
              <div className="mb-3 h-20 rounded-lg bg-gradient-to-br from-[hsl(220,25%,98%)] to-[hsl(220,18%,90%)]" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Light</span>
                <Sun className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Clean daylight surface</p>
            </button>
          </div>
        </GlassCard>

        {/* Tax */}
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-secondary/40">
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-display text-sm font-semibold">Tax</p>
              <p className="text-[11px] text-muted-foreground">
                Used to estimate quarterly taxes owed on the Finance dashboard
              </p>
            </div>
          </div>

          <div className="grid gap-1.5 max-w-xs">
            <Label htmlFor="tax-rate">Effective tax rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="border-border/60 bg-secondary/40"
            />
            <p className="text-[11px] text-muted-foreground">
              Estimated tax owed = (YTD income − YTD expenses) × this rate.
            </p>
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
};

export default SettingsPage;
