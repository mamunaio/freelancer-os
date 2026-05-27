import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { MyWorkLayout } from "@/features/my-work/components/my-work-layout";
import { requireOrgContext } from "@/lib/auth/session";
import { connectMongoose } from "@/lib/db/client";
import { Task, User } from "@/lib/db/models";
import { isBefore, isToday, startOfDay, format, formatDistanceToNow } from "date-fns";
import type { MyWorkData, MyWorkTask } from "@/features/my-work/demo-data";

export default async function MyWorkPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const ctx = await requireOrgContext(locale);
  await connectMongoose();

  // 1. Fetch User settings to get lineup IDs
  const user = await User.findById(ctx.session.userId)
    .populate({
      path: "lineupTaskIds",
      options: { strictPopulate: false },
      populate: {
        path: "projectId",
        select: "name clientId",
        populate: { path: "clientId", select: "name" },
      },
    })
    .lean();

  const lineupIds = new Set(
    (user?.lineupTaskIds || []).map((t: any) => t._id.toString())
  );

  // 2. Fetch all incomplete tasks assigned to the current user
  const tasksRaw = await Task.find({
    organizationId: ctx.orgId,
    assigneeId: ctx.session.userId,
    done: false,
    deletedAt: null,
  })
    .populate({
      path: "projectId",
      select: "name clientId",
      populate: { path: "clientId", select: "name" },
    })
    .lean();

  const overdue: MyWorkTask[] = [];
  const today: MyWorkTask[] = [];
  const upcoming: MyWorkTask[] = [];

  const now = new Date();
  const todayStart = startOfDay(now);

  const mapTaskDoc = (doc: any): MyWorkTask => {
    const isOverdue = doc.dueAt ? isBefore(new Date(doc.dueAt), todayStart) : false;
    const isDueToday = doc.dueAt ? isToday(new Date(doc.dueAt)) : false;
    
    // Format due date string
    let dueStr = "No date";
    if (doc.dueAt) {
      if (isDueToday) dueStr = "Today";
      else if (isOverdue) dueStr = formatDistanceToNow(new Date(doc.dueAt), { addSuffix: true });
      else dueStr = format(new Date(doc.dueAt), "MMM d");
    }

    return {
      id: doc._id.toString(),
      title: doc.title,
      project: doc.projectId?.name || "General",
      client: doc.projectId?.clientId?.name || "Internal",
      priority: doc.priority || "medium",
      status: "todo",
      dueAt: dueStr,
      isOverdue: isOverdue,
      isInLineup: lineupIds.has(doc._id.toString()),
    };
  };

  // Populate task categories
  for (const doc of tasksRaw as any[]) {
    const mapped = mapTaskDoc(doc);
    if (mapped.isOverdue) overdue.push(mapped);
    else if (doc.dueAt && isToday(new Date(doc.dueAt))) today.push(mapped);
    else upcoming.push(mapped);
  }

  // Populate lineup array
  const lineup: MyWorkTask[] = (user?.lineupTaskIds || []).map((doc: any) => ({
    ...mapTaskDoc(doc),
    isInLineup: true,
  }));

  // Determine Focus Task: first task in lineup, fallback to highest priority
  let focusTask: MyWorkTask | null = lineup[0] || null;

  if (!focusTask) {
    // Fallback logic
    for (const task of [...overdue, ...today, ...upcoming]) {
      if (!focusTask) {
        focusTask = task;
      } else if (task.priority === "high" && focusTask.priority !== "high") {
        focusTask = task;
      }
    }
  }

  const liveData: MyWorkData = {
    focusTask,
    overdue,
    today,
    upcoming,
    lineup,
    activity: [
      {
        id: "act-1",
        user: "System",
        action: "synced",
        target: "live MongoDB lineup preferences",
        timeAgo: "Just now",
      },
    ],
  };
  
  return <MyWorkLayout data={liveData} />;
}

export const dynamic = "force-dynamic";
