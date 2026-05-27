import { setRequestLocale } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import { ProposalsList } from "@/components/proposals/proposals-list";
import { hasLocale, type Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Proposals Dashboard — ultra-modern, cinematic proposal management.
 *
 * Web-based proposals (Notion-meets-PandaDoc style) for high-ticket
 * Web Development and Technical SEO services.
 */
export default async function ProposalsPage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const ctx = await requireOrgContext(safeLocale);

  // TODO: Implement listProposals query
  const proposals = await listProposals(ctx.organizationId);

  const canManage = can.editProposals(ctx.role);

  return (
    <ProposalsList
      locale={safeLocale}
      proposals={proposals}
      canManage={canManage}
    />
  );
}

async function listProposals(organizationId: string) {
  const { connectMongoose } = await import("@/lib/db/client");
  const { Proposal } = await import("@/lib/db/models/proposal");
  const { Client } = await import("@/lib/db/models/client");

  await connectMongoose();

  const docs = await Proposal.find({
    organizationId,
    deletedAt: null,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  if (docs.length === 0) return [];

  const clientIds = Array.from(
    new Set(
      docs
        .map((d: { clientId?: { toString(): string } }) =>
          d.clientId?.toString(),
        )
        .filter(Boolean),
    ),
  );

  const clients = await Client.find({ _id: { $in: clientIds } })
    .select("name company")
    .lean();

  const clientMap = new Map(
    clients.map((c: { _id: { toString(): string }; name?: string; company?: string }) => [
      c._id.toString(),
      String(c.company || c.name || ""),
    ]),
  );

  return docs.map((d: Record<string, unknown>) => ({
    id: (d._id as { toString(): string }).toString(),
    title: String(d.title ?? ""),
    clientLabel: d.clientId
      ? clientMap.get((d.clientId as { toString(): string }).toString()) ?? null
      : null,
    totalValue: Number(d.totalValue ?? 0),
    currency: (d.currency as "USD" | "BDT") ?? "USD",
    status: (d.status as "draft" | "sent" | "viewed" | "accepted" | "rejected") ?? "draft",
    validUntil: new Date(d.validUntil as Date).toISOString(),
    shareToken: String(d.shareToken ?? ""),
  }));
}

export const dynamic = "force-dynamic";
