import { setRequestLocale } from "next-intl/server";

import { requireOrgContext } from "@/lib/auth/session";
import { assertRole } from "@/lib/permissions/check";
import { ProposalBuilder } from "@/components/proposals/proposal-builder";
import { hasLocale, type Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Proposals → New — Smart Proposal Builder.
 *
 * Notion-style block-based editor with pre-filled agency template.
 * Admin+ only.
 */
export default async function NewProposalPage({ params }: PageProps) {
  const { locale } = await params;
  const safeLocale: Locale = hasLocale(locale) ? locale : "en";
  setRequestLocale(safeLocale);

  const ctx = await requireOrgContext(safeLocale);
  assertRole(ctx.role, "admin");

  return <ProposalBuilder locale={safeLocale} />;
}

export const dynamic = "force-dynamic";
