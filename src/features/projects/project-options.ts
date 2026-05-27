import "server-only";

import { Types } from "mongoose";

import { connectMongoose } from "@/lib/db/client";
import { Project, ProjectMember } from "@/lib/db/models";
import { ACTIVE_PROJECT_STATUSES } from "@/features/projects/constants";
import type { OrgRole } from "@/lib/db/models/org-member";
import { can } from "@/lib/permissions/roles";

/**
 * Lightweight project picker source — used by Tasks, Time tracking, Finance,
 * and other modules that need a "which project?" select.
 */

export interface ProjectOption {
  id: string;
  name: string;
  clientLabel: string | null;
}

export async function listProjectOptions(
  organizationId: string,
  options: {
    /** Limit to projects the given user can attach work to. */
    visibleTo?: string;
    role?: OrgRole;
    /** Include archived/completed projects too — defaults to false. */
    includeInactive?: boolean;
  } = {},
): Promise<ProjectOption[]> {
  await connectMongoose();

  const query: Record<string, unknown> = {
    organizationId,
    deletedAt: null,
  };
  if (!options.includeInactive) {
    query.status = { $in: ACTIVE_PROJECT_STATUSES };
  }

  // Member visibility — restrict to projects they're listed on.
  if (options.visibleTo && options.role && !can.viewAllProjects(options.role)) {
    const memberOf = await ProjectMember.find({
      organizationId,
      userId: new Types.ObjectId(options.visibleTo),
    })
      .select("projectId")
      .lean();
    const ids = memberOf.map((m) => m.projectId);
    if (ids.length === 0) return [];
    query._id = { $in: ids };
  }

  const docs = await Project.find(query)
    .sort({ name: 1 })
    .select("name clientId")
    .populate({ path: "clientId", select: "name company" })
    .lean();

  return docs.map((d) => {
    const client = d.clientId as
      | { name?: string; company?: string | null }
      | null
      | undefined;
    const clientLabel = client
      ? client.company || client.name || null
      : null;
    return {
      id: d._id.toString(),
      name: String(d.name ?? ""),
      clientLabel,
    };
  });
}
