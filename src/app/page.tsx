import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * Root path always falls into the default locale.
 * Most requests get caught by middleware first, but this is a safety net for
 * direct hits to /.
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
