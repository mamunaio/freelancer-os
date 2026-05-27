/**
 * Centralized model exports.
 *
 * Importing from `@/lib/db/models` ensures the model files are loaded (so
 * Mongoose registers their schemas) before any query runs.
 */

export { User, type UserDoc, type UserId } from "./user";
export {
  Organization,
  type OrganizationDoc,
  type OrganizationId,
} from "./organization";
export { OrgMember, type OrgMemberDoc, type OrgRole } from "./org-member";
export {
  Invitation,
  type InvitationDoc,
  type InvitationStatus,
} from "./invitation";
export { ExchangeRate, type ExchangeRateDoc } from "./exchange-rate";
export { Client, CLIENT_STATUSES, type ClientDoc, type ClientStatus } from "./client";
export {
  Lead,
  LEAD_STAGES,
  LEAD_SOURCES,
  type LeadDoc,
  type LeadStage,
  type LeadSource,
} from "./lead";
export {
  Project,
  PROJECT_STATUSES,
  type ProjectDoc,
  type ProjectStatus,
} from "./project";
export {
  ProjectMember,
  PROJECT_MEMBER_ROLES,
  type ProjectMemberDoc,
  type ProjectMemberRole,
} from "./project-member";
export {
  ProjectMilestone,
  type ProjectMilestoneDoc,
} from "./project-milestone";
