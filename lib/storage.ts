import type { WeeklyReport } from "./types";

const prefix = "appearance-weekly-report:";

export function saveLocalReport(report: WeeklyReport): void {
  localStorage.setItem(`${prefix}${report.week_id}`, JSON.stringify(report));
}

export function getLocalReport(weekId: string): WeeklyReport | null {
  const value = localStorage.getItem(`${prefix}${weekId}`);
  return value ? JSON.parse(value) as WeeklyReport : null;
}

export function getLocalReports(): WeeklyReport[] {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith(prefix))
    .map((key) => getLocalReport(key.slice(prefix.length)))
    .filter((report): report is WeeklyReport => Boolean(report))
    .sort((a, b) => b.period_end.localeCompare(a.period_end));
}

export function getLatestLocalReport(): WeeklyReport | null {
  return getLocalReports().find((report) => report.status === "published") ?? null;
}
