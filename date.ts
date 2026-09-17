export function toLocalISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfWorkWeek(date = new Date()): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

export function endOfWorkWeek(start: Date): Date {
  const copy = new Date(start);
  copy.setDate(copy.getDate() + 4);
  return copy;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const utcDays = Math.floor(value - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
  }
  const text = String(value).trim().replace(/[年/.]/g, "-").replace(/月/g, "-").replace(/日/g, "");
  const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeDate(value: unknown): string {
  const date = parseDate(value);
  return date ? toLocalISO(date) : "";
}

export function formatShortDate(value: string): string {
  const date = parseDate(value);
  return date ? `${date.getMonth() + 1}/${date.getDate()}` : "";
}

export function formatPeriodDate(value: string): string {
  const date = parseDate(value);
  if (!date) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export function getISOWeekId(periodStart: string): string {
  const date = parseDate(periodStart) ?? new Date();
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-w${String(week).padStart(2, "0")}`;
}

export function daysBetween(a: Date, b: Date): number {
  const aDay = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bDay = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bDay - aDay) / 86400000);
}
