/**
 * Client-safe constants for the Clients module.
 *
 * Re-exporting these from `@/lib/db/models` would drag Mongoose (and through
 * it, Node-only modules like `fs`, `tls`) into the client bundle. Anything
 * client components need from the model layer must live here as a plain
 * value or type alias.
 */

export const CLIENT_STATUSES = ["active", "paused", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
