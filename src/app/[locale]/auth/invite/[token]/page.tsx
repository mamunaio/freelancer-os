import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Sparkles, MailWarning, ArrowRight } from "lucide-react";

import { connectMongoose } from "@/lib/db/client";
import { Invitation, Organization, User } from "@/lib/db/models";
import { getSession } from "@/lib/auth/session";
import { acceptInvitationAction } from "@/features/auth/actions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale; token: string }>;
}

/**
 * Public invitation accept page.
 *
 * Three flows:
 *  - logged out + email exists in DB → redirect to login with token.
 *  - logged out + email is new       → redirect to signup pre-filled.
 *  - logged in with the invite email → accept inline + redirect to dashboard.
 *  - logged in with a different email → friendly mismatch screen.
 *
 * The token itself is validated server-side; expired/invalid invitations
 * render an explanatory message.
 */
export default async function InvitePage({ params }: PageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  await connectMongoose();
  const invitation = await Invitation.findOne({
    token,
    status: "pending",
  }).lean();

  if (!invitation) {
    return <ErrorShell title="This invitation isn't valid" body="It may have been revoked or already used. Ask whoever invited you to send a new one." locale={locale} />;
  }

  if (invitation.expiresAt < new Date()) {
    return <ErrorShell title="This invitation has expired" body="Ask whoever invited you to refresh the link from their members page." locale={locale} />;
  }

  const org = await Organization.findById(invitation.organizationId)
    .select("name accentHsl")
    .lean();

  const session = await getSession();

  // Path A — already logged in.
  if (session) {
    if (session.email.toLowerCase() === invitation.email.toLowerCase()) {
      const result = await acceptInvitationAction(token);
      if (!result.ok) {
        return <ErrorShell title="Couldn't join the workspace" body={result.error} locale={locale} />;
      }
      redirect(`/${locale}/dashboard`);
    }

    return <ErrorShell title="Sign in as the invited account" body={`This invitation is for ${invitation.email}. You're currently signed in as ${session.email}. Sign out and try again with the right account.`} locale={locale} />;
  }

  // Path B — not logged in.
  const existingUser = await User.findOne({ email: invitation.email })
    .select("_id")
    .lean();

  const next = `/${locale}/auth/invite/${encodeURIComponent(token)}`;
  if (existingUser) {
    redirect(
      `/${locale}/auth/login?next=${encodeURIComponent(next)}&invitedEmail=${encodeURIComponent(invitation.email)}`,
    );
  }
  redirect(
    `/${locale}/auth/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invitation.email)}&org=${encodeURIComponent(org?.name ?? "")}`,
  );
}

export const dynamic = "force-dynamic";

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function ErrorShell({
  title,
  body,
  locale: _locale,
}: {
  locale: Locale;
  title: string;
  body: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--surface-2))] border border-[hsl(var(--border))]">
          <MailWarning className="h-5 w-5 text-[hsl(var(--warning))]" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
          {body}
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-lg bg-[hsl(var(--primary))] px-5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Back to sign in
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </main>
  );
}
