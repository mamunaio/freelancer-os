import { setRequestLocale } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { assertRole } from "@/lib/permissions/check";
import { listClientOptions } from "@/features/clients/client-options";
import { listProjectOptions } from "@/features/projects/project-options";
import { InvoiceFormPage } from "@/components/money/invoices/invoice-form-page";
import { hasLocale, type Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Money → Invoices → New invoice.
 *
 * Standalone page (not a dialog) because line-item editing needs space.
 * Admin+ only.
 */
export default async function NewInvoicePage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const ctx = await requireOrgContext(safeLocale);
  assertRole(ctx.role, "admin");

  const [clients, projects, org] = await Promise.all([
    listClientOptions(ctx.organizationId),
    listProjectOptions(ctx.organizationId, {
      visibleTo: ctx.session.userId,
      role: ctx.role,
      includeInactive: false,
    }),
    getOrgDefaults(ctx.organizationId),
  ]);

  return (
    <InvoiceFormPage
      locale={safeLocale}
      mode="create"
      clients={clients}
      projects={projects}
      defaultCurrency={org.defaultCurrency}
      defaultTaxRate={org.taxRate}
    />
  );
}

async function getOrgDefaults(organizationId: string) {
  const { Organization } = await import("@/lib/db/models");
  const { connectMongoose } = await import("@/lib/db/client");
  await connectMongoose();
  const org = await Organization.findById(organizationId)
    .select("defaultCurrency taxRate")
    .lean();
  return {
    defaultCurrency: (org?.defaultCurrency ?? "USD") as "USD" | "BDT",
    taxRate: org?.taxRate ?? 0,
  };
}

export const dynamic = "force-dynamic";
