export type TaskStatus = "Inbox" | "Today" | "Waiting" | "Done" | string;

export interface Task {
  id: string;
  name: string;
  priority: string;
  project: string;
  owner: string;
  status: TaskStatus;
  originalDate: string;
  currentExpectedDate: string;
  completedAt: string;
  delayReason: string;
  delayDays: number;
  waitingObject: string;
  waitingContent: string;
  waitingFeedback: string;
  phase: string;
}

export interface ResultRow {
  id: string;
  project: string;
  phase: string;
  goal: string;
  actual: string;
  status: string;
  delay: string;
  delayReason: string;
}

export interface IssueRow {
  id: string;
  project: string;
  issue: string;
  progress: string;
}

export interface NextWeekRow {
  id: string;
  project: string;
  owner: string;
  goal: string;
  dueDate: string;
}

export interface RiskRow {
  id: string;
  project: string;
  risk: string;
  response: string;
}

export interface ReportData {
  results: ResultRow[];
  issues: IssueRow[];
  nextWeek: NextWeekRow[];
  risks: RiskRow[];
}

export interface WeeklyReport {
  id?: string;
  week_id: string;
  period_start: string;
  period_end: string;
  title: string;
  report_data: ReportData;
  status: "draft" | "published";
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}
