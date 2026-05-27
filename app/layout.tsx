import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";

/**
 * Root layout — locale-agnostic.
 * The actual <html lang> and intl provider live in [locale]/layout.tsx so the
 * locale segment can decide them at request time.
 */

export const metadata: Metadata = {
  title: {
    default: "Injaazh OS",
    template: "%s · Injaazh OS",
  },
  description:
    "Single-tenant operating system for solo founders and small studios.",
  icons: {
    icon: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0c14" },
    { media: "(prefers-color-scheme: light)", color: "#fafbfd" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
