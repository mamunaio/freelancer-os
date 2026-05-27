import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { requireOrgContext } from "@/lib/auth/session";
import { can } from "@/lib/permissions/roles";
import {
  listInvitations,
  listMembers,
} from "@/features/members/queries";
import { MembersTable } from "@/components/settings/members/members-table";
import { InvitationsTable } from "@/components/settings/members/invitations-table";
import { InviteDialog } from "@/components/settings/members/invite-dialog";
import type { Locale } from "@/i18n/routing";

/**
 * Settings → Members tab.
 *
 * Manager+ can view; only Admin+ can invite/remove. The invite button is
 * hidden for non-admin viewers, but the table itself stays visible so
 * managers can see their teammates.
 */
export default async function SettingsMembersPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const ctx = await requireOrgContext(locale);
  if (!can.viewTeam(ctx.role)) {
    redirect(`/${locale}/settings/profile`);
  }

  const [members, invitations] = await Promise.all([
    listMembers(ctx.organizationId, ctx.session.userId),
    can.inviteMembers(ctx.role)
      ? listInvitations(ctx.organizationId)
      : Promise.resolve([]),
  ]);

  const t = await getTranslations({ locale, namespace: "Members" });
  const canInvite = can.inviteMembers(ctx.role);
  const isOwner = ctx.role === "owner";

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {t("subtitle")}
          </p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]/80">
            {t("memberCount", { count: members.length })}
          </p>
        </div>
        {canInvite && <InviteDialog locale={locale} isOwner={isOwner} />}
      </header>

      <section className="space-y-3">
        <MembersTable
          locale={locale}
          viewerRole={ctx.role}
          members={members}
        />
      </section>

      {canInvite && (
        <section className="space-y-3">
          <header>
            <h3 className="font-display text-base font-semibold tracking-tight">
              {t("invitations.title")}
            </h3>
          </header>
          <InvitationsTable locale={locale} invitations={invitations} />
        </section>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
