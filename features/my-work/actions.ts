"use server";

import { revalidatePath } from "next/cache";
import { connectMongoose } from "@/lib/db/client";
import { User } from "@/lib/db/models";
import { requireSession } from "@/lib/auth/session";
import type { Locale } from "@/i18n/routing";
import mongoose from "mongoose";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Toggles a task's presence in the logged-in user's Lineup list.
 */
export async function toggleLineupAction(
  taskId: string,
  locale: Locale = "en"
): Promise<ActionResult> {
  try {
    const session = await requireSession(locale);
    await connectMongoose();

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return { ok: false, error: "Invalid task ID" };
    }

    const taskObjectId = new mongoose.Types.ObjectId(taskId);

    // Find the user first to see if it's already pinned
    const user = await User.findById(session.userId).select("lineupTaskIds");
    if (!user) {
      return { ok: false, error: "User not found" };
    }

    const lineup = user.lineupTaskIds || [];
    const index = lineup.findIndex((id: any) => id.toString() === taskId);

    if (index >= 0) {
      // Unpin
      lineup.splice(index, 1);
    } else {
      // Pin
      lineup.push(taskObjectId);
    }

    await User.updateOne(
      { _id: session.userId },
      { $set: { lineupTaskIds: lineup } }
    );

    revalidatePath(`/${locale}/my`);

    return { ok: true, data: undefined };
  } catch (error: any) {
    return { ok: false, error: error.message || "Something went wrong" };
  }
}
