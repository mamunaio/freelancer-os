import { getTranslations, setRequestLocale } from "next-intl/server";

import { connectMongoose } from "@/lib/db/client";
import { Invitation, Organization } from "@/lib/db/models";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    invite?: string;
    email?: string;
    org?: string;
  }>;
}

/**
 * Signup page.
 *
 * Two flows:
 *  - Default: create a new workspace (this user becomes Owner).
 *  - Invitation: ?invite=<token> joins the inviting org as the role spelled
 *    out on the invitation. The email field is pre-filled and locked.
 *
 * The invitation is validated server-side here so we can show a friendly
 * "this invite is dead" screen instead of letting the user fill out the
 * form just to fail on submit.
 */
export default async function SignupPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { invite: inviteToken, email: emailFromUrl } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Auth" });
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);

  // Validate the invitation if one was passed.
  let invite: { token: string; email: string; orgName: string } | null = null;
  if (inviteToken) {
    await connectMongoose();
    const inv = await Invitation.findOne({
      token: inviteToken,
      status: "pending",
    }).lean();
    if (inv && inv.expiresAt > new Date()) {
      const org = await Organization.findById(inv.organizationId)
        .select("name")
        .lean();
      invite = {
        token: inviteToken,
        email: inv.email,
        orgName: org?.name ?? "Workspace",
      };
    }
  }

  const title = invite ? `Join ${invite.orgName}` : t("signupTitle");
  const subtitle = invite
    ? `You've been invited as a teammate. Set up your account to accept.`
    : t("signupSubtitle");

  return (
    <AuthShell
      locale={locale}
      eyebrow={t("eyebrowSignup")}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          {t("alreadyHaveAccount")}{" "}
          <Link
            href={
              invite
                ? `/auth/login?invitedEmail=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/${locale}/auth/invite/${invite.token}`)}`
                : "/auth/login"
            }
            className="font-medium text-[hsl(var(--foreground))] hover:underline"
          >
            {t("signInInstead")}
          </Link>
        </>
      }
    >
      {googleEnabled && !invite && (
        <>
          <GoogleButton
            label={t("continueWithGoogle")}
            callbackUrl={`/${locale}/dashboard`}
          />
          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
            <span className="h-px flex-1 bg-[hsl(var(--border))]" />
            {t("or")}
            <span className="h-px flex-1 bg-[hsl(var(--border))]" />
          </div>
        </>
      )}

      <SignupForm
        locale={locale}
        invite={
          invite
            ? { token: invite.token, email: emailFromUrl ?? invite.email }
            : undefined
        }
      />
    </AuthShell>
  );
}

export const dynamic = "force-dynamic";
