import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { listClientOptions } from "@/features/clients/client-options";
import { listProjectOptions } from "@/features/projects/project-options";
import { getInvoiceById } from "@/features/money/invoices/queries";
import { InvoiceDetailPage } from "@/components/money/invoices/invoice-detail-page";
import { hasLocale, type Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

/**
 * Money → Invoices → [id] detail.
 *
 * View/edit invoice, status timeline, send/mark-paid/void actions.
 * Side panel shows the synced ledger entry (if paid).
 */
export default async function InvoiceDetailPageRoute({ params }: PageProps) {
  const { locale, id } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const ctx = await requireOrgContext(safeLocale);

  const invoice = await getInvoiceById(ctx.organizationId, id);
  if (!invoice) notFound();

  const [clients, projects, org] = await Promise.all([
    listClientOptions(ctx.organizationId),
    listProjectOptions(ctx.organizationId, {
      visibleTo: ctx.session.userId,
      role: ctx.role,
      includeInactive: false,
    }),
    getOrgDefaults(ctx.organizationId),
  ]);

  const canManage = can.editFinance(ctx.role);

  return (
    <InvoiceDetailPage
      locale={safeLocale}
      invoice={invoice}
      clients={clients}
      projects={projects}
      defaultCurrency={org.defaultCurrency}
      defaultTaxRate={org.taxRate}
      canManage={canManage}
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
