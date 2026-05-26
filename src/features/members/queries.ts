import "server-only";

import { connectMongoose } from "@/lib/db/client";
import { Invitation, OrgMember, User } from "@/lib/db/models";
import type { OrgRole } from "@/lib/db/models/org-member";
import type { InvitationStatus } from "@/lib/db/models/invitation";

/**
 * Read helpers for the members + invitations surfaces.
 *
 * Returned shapes are plain JSON so they can be passed into client
 * components from server pages without further serialization.
 */

export interface MemberRow {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  image: string | null;
  role: OrgRole;
  joinedAt: string;
  isYou: boolean;
}

export async function listMembers(
  organizationId: string,
  currentUserId: string,
): Promise<MemberRow[]> {
  await connectMongoose();

  const members = await OrgMember.find({
    organizationId,
    status: "active",
  })
    .sort({ joinedAt: 1 })
    .lean();

  if (members.length === 0) return [];

  const userIds = members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } })
    .select("_id name email image")
    .lean();

  const usersById = new Map(users.map((u) => [u._id.toString(), u]));

  // Owner first, then admins, managers, members. Within each role, sort by
  // join date ascending.
  const roleRank: Record<OrgRole, number> = {
    owner: 0,
    admin: 1,
    manager: 2,
    member: 3,
  };

  return members
    .map((m): MemberRow => {
      const user = usersById.get(m.userId.toString());
      return {
        id: m._id.toString(),
        userId: m.userId.toString(),
        email: user?.email ?? "(deleted user)",
        name: user?.name ?? null,
        image: user?.image ?? null,
        role: m.role as OrgRole,
        joinedAt: (m.joinedAt instanceof Date
          ? m.joinedAt
          : new Date(m.joinedAt)
        ).toISOString(),
        isYou: m.userId.toString() === currentUserId,
      };
    })
    .sort((a, b) => {
      const r = roleRank[a.role] - roleRank[b.role];
      if (r !== 0) return r;
      return a.joinedAt.localeCompare(b.joinedAt);
    });
}

export interface InvitationRow {
  id: string;
  email: string;
  role: OrgRole;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export async function listInvitations(
  organizationId: string,
): Promise<InvitationRow[]> {
  await connectMongoose();

  const invitations = await Invitation.find({
    organizationId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .lean();

  return invitations.map((inv) => ({
    id: inv._id.toString(),
    email: inv.email,
    role: inv.role as OrgRole,
    status: inv.status as InvitationStatus,
    token: inv.token,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: (inv.createdAt instanceof Date
      ? inv.createdAt
      : new Date(inv.createdAt)
    ).toISOString(),
  }));
}
