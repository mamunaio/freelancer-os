"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectMongoose } from "@/lib/db/client";
import { User } from "@/lib/db/models";
import { requireSession } from "@/lib/auth/session";
import {
  DASHBOARD_SECTIONS,
  type DashboardSectionId,
} from "@/lib/dashboard/sections";
import type { Locale } from "@/i18n/routing";

/**
 * Server action for saving the per-user dashboard layout.
 *
 * Trusted ids only: the schema rejects any id we don't know about, so a
 * tampered payload can't sneak unknown sections into the layout.
 */

const ALLOWED_IDS = DASHBOARD_SECTIONS.map((s) => s.id) as readonly DashboardSectionId[];
const LOCKED_IDS = new Set(
  DASHBOARD_SECTIONS.filter((s) => s.locked).map((s) => s.id),
);

const sectionSchema = z.object({
  id: z.enum(ALLOWED_IDS as unknown as [DashboardSectionId, ...DashboardSectionId[]]),
  visible: z.boolean(),
});

const layoutSchema = z.object({
  sections: z.array(sectionSchema).min(1).max(50),
});

export type LayoutInput = z.infer<typeof layoutSchema>;
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function saveDashboardLayoutAction(
  input: LayoutInput,
  locale: Locale = "en",
): Promise<ActionResult> {
  const session = await requireSession(locale);

  const parsed = layoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid layout payload",
    };
  }

  // Force locked sections to stay visible no matter what was sent.
  const sanitized = parsed.data.sections.map((s) => ({
    id: s.id,
    visible: LOCKED_IDS.has(s.id) ? true : s.visible,
  }));

  await connectMongoose();
  await User.updateOne(
    { _id: session.userId },
    { dashboardLayout: { sections: sanitized } },
  );

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/settings/dashboard`);

  return { ok: true, data: undefined };
}
