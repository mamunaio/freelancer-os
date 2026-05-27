import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { connectMongoose } from "@/lib/db/client";
import { OrgMember } from "@/lib/db/models";
import { getSession } from "@/lib/auth/session";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

/**
 * Recovery page for orphaned authenticated users. Lets them mint a fresh
 * workspace and become its owner. Healthy users (already have an org) are
 * bounced straight to the dashboard.
 */
export default async function OnboardingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session) redirect(`/${locale}/auth/login`);

  await connectMongoose();
  const member = await OrgMember.findOne({
    userId: session.userId,
    status: "active",
  })
    .select("_id")
    .lean();

  // Already in an org — short-circuit to the app.
  if (member) redirect(`/${locale}/dashboard`);

  return (
    <AuthShell
      locale={locale}
      eyebrow="One last step"
      title="Create your workspace"
      subtitle="Pick a name. You'll become the owner. You can invite teammates from settings."
    >
      <OnboardingForm
        locale={locale}
        defaultName={session.name ? `${session.name}'s studio` : "My studio"}
      />
    </AuthShell>
  );
}

export const dynamic = "force-dynamic";
