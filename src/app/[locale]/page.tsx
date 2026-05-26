import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { ScaffoldLanding } from "@/components/scaffold/landing";
import type { Locale } from "@/i18n/routing";

interface HomeProps {
  params: Promise<{ locale: Locale }>;
}

/**
 * Phase 0 placeholder home page.
 * Confirms the i18n + theme + Tailwind v4 + font pipeline is green.
 *
 * Will be replaced by the protected dashboard once auth + Supabase types
 * are wired in Phase 1.
 */
export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);

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
