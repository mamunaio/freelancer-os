import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

import { ScaffoldLanding } from "@/components/scaffold/landing";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";

interface HomeProps {
  params: Promise<{ locale: Locale }>;
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Logged-in users skip the marketing scaffold.
  const session = await getSession();
  if (session) redirect(`/${locale}/dashboard`);

  const t = await getTranslations({ locale });

  return (
    <ScaffoldLanding
      locale={locale}
      title={t("Meta.title")}
      tagline={t("Meta.tagline")}
      description={t("Meta.description")}
    />
  );
}


// Reads auth session → must run per-request, not at build time.
export const dynamic = "force-dynamic";
