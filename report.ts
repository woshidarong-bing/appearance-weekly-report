import { daysBetween, formatShortDate, normalizeDate, parseDate } from "./date";
import type { IssueRow, NextWeekRow, ReportData, ResultRow, RiskRow, Task } from "./types";

type ExcelRow = Record<string, unknown>;

const text = (value: unknown) => String(value ?? "").trim();
const unique = (values: string[]) => [...new Set(values.map((v) => v.trim()).filter(Boolean))];
const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function read(row: ExcelRow, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return "";
}

export function parseExcelRows(rows: ExcelRow[]): Task[] {
  return rows.map((row, index) => {
    const original = read(row, "原计划处理日", "原计划完成日", "计划处理日");
    const current = read(row, "当前预计处理日", "当前预计完成日", "预计处理日", "计划处理日") || original;
    const givenDelay = Number.parseFloat(text(read(row, "延期天数")));
    return {
      id: `task-${index}`,
      name: text(read(row, "任务名称")),
      priority: text(read(row, "优先级")),
      project: text(read(row, "所属项目")) || "未归属项目",
      owner: text(read(row, "负责人(0)", "负责人")),
      status: text(read(row, "状态")),
      originalDate: normalizeDate(original),
      currentExpectedDate: normalizeDate(current),
      completedAt: normalizeDate(read(row, "完成时间")),
      delayReason: text(read(row, "延期说明", "延期原因")),
      delayDays: Number.isFinite(givenDelay) ? Math.max(0, Math.round(givenDelay)) : 0,
      waitingObject: text(read(row, "Waiting对象")),
      waitingContent: text(read(row, "Waiting内容")),
      waitingFeedback: text(read(row, "Waiting反馈结果")),
      phase: text(read(row, "所属阶段", "阶段")),
    };
  }).filter((task) => task.name);
}

export function taskDelayDays(task: Task): number {
  const original = parseDate(task.originalDate);
  const target = task.status === "Done" ? parseDate(task.completedAt) : parseDate(task.currentExpectedDate);
  if (original && target) return Math.max(0, daysBetween(original, target));
  return Math.max(0, task.delayDays || 0);
}

export function taskDelayText(task: Task): string {
  const days = taskDelayDays(task);
  if (!days) return "";
  const isDone = task.status === "Done";
  const target = isDone ? task.completedAt : task.currentExpectedDate;
  const targetText = formatShortDate(target);
  return `延期${days}天${targetText ? ` · ${isDone ? "" : "预计"}${targetText}完成` : ""}`;
}

function withoutProjectPrefix(name: string, project: string): string {
  if (!project || project === "未归属项目") return name;
  const trimmed = name.startsWith(project) ? name.slice(project.length) : name;
  return trimmed.replace(/^[\s·—_\-:：]+/, "") || name;
}

function aggregateStatus(tasks: Task[]): string {
  if (tasks.every((task) => task.status === "Done")) return "已完成";
  if (tasks.some((task) => task.status === "Today") || tasks.some((task) => task.status === "Done")) return "进行中";
  if (tasks.some((task) => task.status === "Waiting")) return "等待中";
  return "未安排";
}

export function taskInScope(task: Task, start: string, end: string, all: boolean): boolean {
  if (all) return true;
  const from = parseDate(start);
  const to = parseDate(end);
  if (!from || !to) return true;
  const inRange = (value: string) => {
    const date = parseDate(value);
    return !!date && date >= from && date <= new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
  };
  return inRange(task.originalDate) || inRange(task.currentExpectedDate) || inRange(task.completedAt) || task.status === "Today" || task.status === "Waiting";
}

export function generateReport(tasks: Task[], periodEnd: string): ReportData {
  const grouped = new Map<string, Task[]>();
  for (const task of tasks) grouped.set(task.project, [...(grouped.get(task.project) ?? []), task]);

  const results: ResultRow[] = [];
  const issues: IssueRow[] = [];
  const nextWeek: NextWeekRow[] = [];
  const risks: RiskRow[] = [];
  const periodEndDate = parseDate(periodEnd);

  for (const [project, projectTasks] of grouped) {
    const done = projectTasks.filter((task) => task.status === "Done");
    const open = projectTasks.filter((task) => task.status !== "Done");
    const waiting = projectTasks.filter((task) => task.status === "Waiting");
    const delayTexts = unique(projectTasks.map(taskDelayText));
    const reasons = unique(projectTasks.map((task) => task.delayReason));
    const waitingDetails = unique(waiting.flatMap((task) => [task.waitingContent, task.delayReason]));
    const feedback = unique(waiting.flatMap((task) => [task.waitingFeedback, task.waitingObject ? `等待${task.waitingObject}` : ""]));

    results.push({
      id: uid(),
      project,
      phase: unique(projectTasks.map((task) => task.phase)).join("；") || "—",
      goal: unique(projectTasks.map((task) => withoutProjectPrefix(task.name, project))).join("；"),
      actual: unique(done.map((task) => withoutProjectPrefix(task.name, project))).join("；") || "—",
      status: aggregateStatus(projectTasks),
      delay: delayTexts.join("；") || "—",
      delayReason: reasons.join("；") || "—",
    });

    if (waiting.length || projectTasks.some((task) => taskDelayDays(task) > 0)) {
      issues.push({
        id: uid(),
        project,
        issue: waitingDetails.join("；") || reasons.join("；") || unique(waiting.map((task) => withoutProjectPrefix(task.name, project))).join("；"),
        progress: feedback.join("；") || "—",
      });
    }

    if (open.length) {
      const dates = open.map((task) => task.currentExpectedDate || task.originalDate).filter(Boolean).sort();
      nextWeek.push({
        id: uid(),
        project,
        owner: unique(open.map((task) => task.owner)).join("、") || "—",
        goal: unique(open.map((task) => withoutProjectPrefix(task.name, project))).join("；"),
        dueDate: dates[0] || "",
      });
    }

    const riskTasks = projectTasks.filter((task) => {
      const overdueWaiting = task.status === "Waiting" && periodEndDate && parseDate(task.currentExpectedDate) && parseDate(task.currentExpectedDate)! < periodEndDate;
      return taskDelayDays(task) > 0 || overdueWaiting;
    });
    if (riskTasks.length) {
      risks.push({
        id: uid(),
        project,
        risk: unique(riskTasks.flatMap((task) => [task.delayReason, task.waitingContent])).join("；") || unique(riskTasks.map((task) => withoutProjectPrefix(task.name, project))).join("；"),
        response: unique(riskTasks.map((task) => task.waitingFeedback)).join("；") || "—",
      });
    }
  }

  return { results, issues, nextWeek, risks };
}

export const emptyReport = (): ReportData => ({ results: [], issues: [], nextWeek: [], risks: [] });
