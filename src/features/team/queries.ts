import "server-only";

import { connectMongoose } from "@/lib/db/client";
import { OrgMember, User } from "@/lib/db/models";

/**
 * Read helper for any module that needs the org's active member list as
 * picker options (e.g., Lead.ownerId, Project.lead, Task.assigneeId).
 *
 * Lives outside features/members because the members surface itself uses
 * the richer `listMembers` query — this is the lighter "just give me a
 * dropdown of active people" version.
 */

export interface MemberOption {
  id: string;
  name: string;
  email: string;
}

export async function listOrgMemberOptions(
  organizationId: string,
): Promise<MemberOption[]> {
  await connectMongoose();

  const members = await OrgMember.find({
    organizationId,
    status: "active",
  })
    .select("userId")
    .lean();

  if (members.length === 0) return [];

  const userIds = members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email")
    .lean();

  return users
    .map((u) => ({
      id: u._id.toString(),
      name: u.name ?? u.email ?? "(unnamed)",
      email: u.email ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
