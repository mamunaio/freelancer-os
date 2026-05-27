import { getRequestConfig } from "next-intl/server";
import { hasLocale, routing } from "./routing";

/**
 * Loads the message catalog for the active request.
 * Called by next-intl's middleware and server components.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
