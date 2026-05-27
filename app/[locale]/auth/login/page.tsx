import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleButton } from "@/components/auth/google-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function LoginPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Auth" });
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID);

  return (
    <AuthShell
      locale={locale}
      eyebrow={t("eyebrowLogin")}
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-[hsl(var(--foreground))] hover:underline"
          >
            {t("createOne")}
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

      <LoginForm locale={locale} />
    </AuthShell>
  );
}
