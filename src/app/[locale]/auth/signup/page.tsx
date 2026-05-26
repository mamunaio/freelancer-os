import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function SignupPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Auth" });
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);

  return (
    <AuthShell
      locale={locale}
      eyebrow={t("eyebrowSignup")}
      title={t("signupTitle")}
      subtitle={t("signupSubtitle")}
      footer={
        <>
          {t("alreadyHaveAccount")}{" "}
          <Link
            href="/auth/login"
            className="font-medium text-[hsl(var(--foreground))] hover:underline"
          >
            {t("signInInstead")}
          </Link>
        </>
      }
    >
      {googleEnabled && (
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

      <SignupForm locale={locale} />
    </AuthShell>
  );
}
