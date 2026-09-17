"use client";

import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import BossReportView from "./BossReportView";
import { getLatestLocalReport, getLocalReport } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import type { WeeklyReport } from "@/lib/types";

export default function WeeklyViewer({ weekId }: { weekId?: string }) {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestedWeekId, setRequestedWeekId] = useState(weekId);

  useEffect(() => {
    const resolvedWeekId = weekId || new URLSearchParams(window.location.search).get("weekId") || undefined;
    setRequestedWeekId(resolvedWeekId);
    const supabase = getSupabase();
    if (!supabase) {
      setReport(resolvedWeekId ? getLocalReport(resolvedWeekId) : getLatestLocalReport());
      setLoading(false);
      return;
    }
    let query = supabase.from("weekly_reports").select("*").eq("status", "published");
    query = resolvedWeekId ? query.eq("week_id", resolvedWeekId).limit(1) : query.order("period_end", { ascending: false }).limit(1);
    query.maybeSingle().then(({ data }) => {
      setReport(data as WeeklyReport | null);
      setLoading(false);
    });
  }, [weekId]);

  if (loading) return <div className="center-state"><div className="spinner"/><p>正在加载周报…</p></div>;
  if (!report) return <><AppHeader compact/><main className="public-empty"><div className="empty-illustration">周</div><h1>暂无已发布周报</h1><p>{requestedWeekId ? "该期周报不存在或尚未发布。" : "最新周报发布后会显示在这里。"}</p></main></>;
  return <><AppHeader compact/><BossReportView data={report.report_data} start={report.period_start} end={report.period_end}/></>;
}
