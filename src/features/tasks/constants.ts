/**
 * Client-safe constants for the Tasks module.
 *
 * Task model is Eisenhower-flavoured: every task lives in exactly one of the
 * four quadrants (urgent × important). Quadrant + priority are independent
 * — quadrant is *intent* (where it belongs in the matrix), priority is
 * *severity* (visual weight when sorting / styling).
 */

export const TASK_PRIORITIES = ["high", "medium", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_QUADRANTS = ["q1", "q2", "q3", "q4"] as const;
export type TaskQuadrant = (typeof TASK_QUADRANTS)[number];

/**
 * Eisenhower mapping:
 *   q1: Urgent + Important     → Do now
 *   q2: Not urgent + Important → Schedule
 *   q3: Urgent + Not important → Delegate
 *   q4: Not urgent + Not important → Eliminate
 */
export const QUADRANT_META: Record<
  TaskQuadrant,
  { urgent: boolean; important: boolean }
> = {
  q1: { urgent: true, important: true },
  q2: { urgent: false, important: true },
  q3: { urgent: true, important: false },
  q4: { urgent: false, important: false },
};

export const QUADRANT_ORDER: TaskQuadrant[] = ["q1", "q2", "q3", "q4"];

/** Helpful presets surfaced as chips in the form. */
export const WORK_TYPES = [
  "deep_work",
  "shallow",
  "admin",
  "meeting",
  "creative",
  "review",
] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const ENERGY_LEVELS = ["high", "medium", "low"] as const;
export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

/** Common time-estimate buckets in minutes. */
export const ESTIMATE_PRESETS = [15, 30, 60, 90, 120, 240] as const;

export const TASK_VIEWS = ["matrix", "list", "byProject", "myTasks"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];
