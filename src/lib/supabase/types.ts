/**
 * Supabase generated types — placeholder.
 *
 * TODO: Regenerate with the Supabase CLI once the new project is wired up:
 *   supabase gen types typescript --project-id pyropxehxmicsjfwovjb --schema public > src/lib/supabase/types.ts
 *
 * The legacy (Vite) project's types are preserved in the `legacy-vite` branch
 * for reference. Regenerating from the live database is preferred to avoid
 * drift.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
