export interface MyWorkTask {
  id: string;
  title: string;
  project: string;
  client: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in-progress" | "review";
  dueAt: string;
  isOverdue: boolean;
  isInLineup?: boolean;
}

export interface MyWorkActivity {
  id: string;
  user: string;
  action: string;
  target: string;
  timeAgo: string;
}

export interface MyWorkData {
  focusTask: MyWorkTask | null;
  overdue: MyWorkTask[];
  today: MyWorkTask[];
  upcoming: MyWorkTask[];
  lineup: MyWorkTask[];
  activity: MyWorkActivity[];
}

export function buildDemoMyWorkData(): MyWorkData {
  return {
    focusTask: {
      id: "tsk-001",
      title: "Review Q3 brand guidelines for Lumen",
      project: "Lumen brand refresh",
      client: "Lumen Corp",
      priority: "high",
      status: "in-progress",
      dueAt: "Today",
      isOverdue: false,
    },
    overdue: [
      {
        id: "tsk-002",
        title: "Finalize Northwind invoice #INV-0149",
        project: "Retainer Billing",
        client: "Northwind Studio",
        priority: "high",
        status: "todo",
        dueAt: "2 days ago",
        isOverdue: true,
      }
    ],
    today: [
      {
        id: "tsk-003",
        title: "Stellar Co — final design handoff",
        project: "Stellar Web App",
        client: "Stellar Co",
        priority: "medium",
        status: "todo",
        dueAt: "Today",
        isOverdue: false,
      },
      {
        id: "tsk-004",
        title: "Send weekly update to Acme",
        project: "Acme Retainer",
        client: "Acme Corp",
        priority: "low",
        status: "review",
        dueAt: "Today",
        isOverdue: false,
      }
    ],
    upcoming: [
      {
        id: "tsk-005",
        title: "Draft Q4 proposal for GlobalTech",
        project: "Sales",
        client: "GlobalTech",
        priority: "high",
        status: "todo",
        dueAt: "Tomorrow",
        isOverdue: false,
        isInLineup: false,
      },
      {
        id: "tsk-006",
        title: "Client sync: Q3 Review",
        project: "Lumen brand refresh",
        client: "Lumen Corp",
        priority: "medium",
        status: "todo",
        dueAt: "Friday",
        isOverdue: false,
        isInLineup: false,
      }
    ],
    lineup: [],
    activity: [
      {
        id: "act-1",
        user: "Anika",
        action: "mentioned you on",
        target: "Stellar wireframes",
        timeAgo: "2h ago",
      },
      {
        id: "act-2",
        user: "Ridwan",
        action: "completed",
        target: "Logo concepts (round 2)",
        timeAgo: "4h ago",
      },
      {
        id: "act-3",
        user: "Mehedi",
        action: "assigned you to",
        target: "Acme audit",
        timeAgo: "Yesterday",
      }
    ]
  };
}
