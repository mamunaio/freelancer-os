import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WorkspaceSettings {
  id: string;
  name: string;
  tagline: string | null;
  accent_hsl: string;
  logo_url: string | null;
  tax_rate: number;
}

interface WorkspaceCtx {
  settings: WorkspaceSettings | null;
  isLoading: boolean;
  refresh: () => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export const useWorkspace = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return c;
};

/** Convert HSL string "226 100% 65%" → derive complementary glow */
const deriveGlow = (hsl: string): string => {
  // Bump hue by ~25° toward purple, keep saturation/lightness
  const parts = hsl.trim().split(/\s+/);
  const h = parseFloat(parts[0]) || 226;
  const s = parts[1] ?? "90%";
  const l = parts[2] ?? "70%";
  const newH = (h + 25) % 360;
  return `${newH} ${s} ${l}`;
};

const applyAccent = (hsl: string) => {
  const root = document.documentElement;
  const glow = deriveGlow(hsl);
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--sidebar-primary", hsl);
  root.style.setProperty("--sidebar-ring", hsl);
  root.style.setProperty("--primary-glow", glow);
  root.style.setProperty(
    "--gradient-primary",
    `linear-gradient(135deg, hsl(${hsl}) 0%, hsl(${glow}) 100%)`,
  );
  root.style.setProperty(
    "--shadow-glow",
    `0 10px 40px -10px hsl(${hsl} / 0.4)`,
  );
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["workspace-settings"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_settings")
        .select("id, name, tagline, accent_hsl, logo_url, tax_rate")
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as WorkspaceSettings | null;
    },
  });

  // Apply accent globally
  useEffect(() => {
    if (settings?.accent_hsl) applyAccent(settings.accent_hsl);
  }, [settings?.accent_hsl]);

  // Update <title> from workspace name
  useEffect(() => {
    if (settings?.name) document.title = `${settings.name} · OS`;
  }, [settings?.name]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["workspace-settings"] });

  return (
    <Ctx.Provider value={{ settings: settings ?? null, isLoading, refresh }}>
      {children}
    </Ctx.Provider>
  );
}
