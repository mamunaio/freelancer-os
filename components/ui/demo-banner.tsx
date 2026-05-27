"use client";

import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

export function DemoBanner() {
  const t = useTranslations("Dashboard");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed it before
    const dismissed = localStorage.getItem("demo-banner-dismissed");
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("demo-banner-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="col-span-1 lg:col-span-12 flex items-start justify-between gap-2.5 rounded-lg border border-[hsl(var(--info))]/30 bg-[hsl(var(--info))]/8 px-3 py-2 text-[11px] text-[hsl(var(--info))] transition-all">
      <div className="flex gap-2.5">
        <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
        <p>
          <span className="font-semibold">{t("demoBadge", { defaultValue: "Demo data" })}.</span>{" "}
          <span className="text-[hsl(var(--foreground))]/80">
            {t("demoNotice", { defaultValue: "These figures are illustrative — they swap to live data once the underlying modules ship." })}
          </span>
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 hover:bg-[hsl(var(--info))]/20 rounded-md transition-colors"
        title="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
