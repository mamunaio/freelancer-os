import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";

import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceAccent } from "@/components/workspace-accent";
import { connectMongoose } from "@/lib/db/client";
import { Organization } from "@/lib/db/models";
import { requireOrgContext } from "@/lib/auth/session";
import { hasLocale } from "@/i18n/routing";

/**
 * Protected app layout — wraps everything under /(app)/ with the shell
 * (sidebar + header). Server-side auth gate runs first; failed auth
 * redirects to /auth/login.
 *
 * Also applies the workspace accent color at runtime so the brand follows
 * across every page beneath this layout.
 */
export default async function ProtectedAppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const ctx = await requireOrgContext(safeLocale);

  // Hydrate organization name + accent once on the server so the sidebar
  // shows them immediately without a client roundtrip.
  await connectMongoose();
  const org = await Organization.findById(ctx.organizationId)
    .select("name accentHsl")
    .lean();

  return (
    <WorkspaceAccent accentHsl={org?.accentHsl ?? null}>
      <AppShell
        locale={safeLocale}
        session={{
          userId: ctx.session.userId,
          email: ctx.session.email,
          name: ctx.session.name,
          image: ctx.session.image,
          role: ctx.role,
          organizationId: ctx.organizationId,
          organizationName: org?.name ?? "Workspace",
        }}
      >
        {children}
      </AppShell>
    </WorkspaceAccent>
  );
}
