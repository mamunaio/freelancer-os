"use client";

import { useTranslations } from "next-intl";
import { Languages } from "lucide-react";

import { useRouter, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
}

/**
 * Compact language toggle in the header — flips between en and bn while
 * preserving the current pathname.
 */
export function LanguageToggle({ locale }: Props) {
  const t = useTranslations("Header");
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale: Locale = locale === "en" ? "bn" : "en";
  const otherLabel = otherLocale === "bn" ? t("bengali") : t("english");

  return (
    <button
      type="button"
      onClick={() =>
        router.replace(pathname, { locale: otherLocale, scroll: false })
      }
      className="flex h-9 items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))] focus-ring"
      title={`${t("language")}: ${otherLabel}`}
    >
      <Languages className="h-3.5 w-3.5" />
      <span>{otherLocale === "bn" ? "বাংলা" : "EN"}</span>
    </button>
  );
}
