"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "./AppHeader";
import { getLocalReports } from "@/lib/storage";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { formatShortDate } from "@/lib/date";
import type { WeeklyReport } from "@/lib/types";

export default function HistoryView() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReports(getLocalReports());
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user) { router.replace("/login"); return; }
      const { data } = await supabase.from("weekly_reports").select("*").order("period_end", { ascending: false });
      setReports((data ?? []) as WeeklyReport[]);
      setLoading(false);
    });
  }, [router]);

  const grouped = useMemo(() => reports.reduce<Record<string, WeeklyReport[]>>((acc, report) => {
    const year = report.week_id.slice(0, 4);
    (acc[year] ??= []).push(report);
    return acc;
  }, {}), [reports]);

  return <><AppHeader actions={<Link className="button" href="/editor">返回编辑</Link>}/>{!isSupabaseConfigured() && <div className="demo-banner"><b>本地演示模式</b><span>这里仅显示当前浏览器保存的周报。</span></div>}<main className="history-page"><div className="history-heading"><div><span className="eyebrow">REPORT ARCHIVE</span><h1>历史周报</h1><p>按自然周保存的正式快照</p></div><Link className="button primary" href="/editor">新建本周周报</Link></div>
    {loading ? <div className="center-state inline"><div className="spinner"/></div> : reports.length ? Object.entries(grouped).map(([year, rows]) => <section className="history-year" key={year}><h2>{year}</h2><div className="history-list">{rows.map((report) => { const week = Number(report.week_id.split("w")[1]); return <article className="history-row" key={report.week_id}><div className="week-tile"><span>W</span><b>{String(week).padStart(2, "0")}</b></div><div className="history-info"><h3>第 {week} 周</h3><p>{formatShortDate(report.period_start)}—{formatShortDate(report.period_end)} · {report.status === "published" ? "已发布" : "草稿"}</p></div><div className="history-row-actions"><Link href={`/editor?weekId=${report.week_id}`}>编辑</Link><Link className="button" href={`/weekly?weekId=${report.week_id}`}>查看周报</Link></div></article>; })}</div></section>) : <div className="history-empty"><div>周</div><h2>还没有历史周报</h2><p>发布第一份周报后，它会永久保存在这里。</p></div>}
  </main></>;
}
