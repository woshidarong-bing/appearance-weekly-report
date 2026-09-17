"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import AppHeader from "./AppHeader";
import AutoTextarea from "./AutoTextarea";
import BossReportView from "./BossReportView";
import { CheckIcon, CopyIcon, EyeIcon, MoreIcon, SendIcon, TrashIcon, UploadIcon } from "./Icons";
import { endOfWorkWeek, getISOWeekId, startOfWorkWeek, toLocalISO } from "@/lib/date";
import { emptyReport, generateReport, parseExcelRows, taskDelayDays, taskInScope } from "@/lib/report";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getLocalReport, saveLocalReport } from "@/lib/storage";
import type { IssueRow, NextWeekRow, ReportData, ResultRow, RiskRow, Task, WeeklyReport } from "@/lib/types";

const uid = () => crypto.randomUUID();

export default function ReportEditor() {
  const monday = useMemo(() => startOfWorkWeek(), []);
  const [start, setStart] = useState(toLocalISO(monday));
  const [end, setEnd] = useState(toLocalISO(endOfWorkWeek(monday)));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [data, setData] = useState<ReportData>(emptyReport);
  const [owner, setOwner] = useState("");
  const [scope, setScope] = useState<"week" | "all">("week");
  const [fileName, setFileName] = useState("尚未上传");
  const [preview, setPreview] = useState(false);
  const [publishState, setPublishState] = useState<{ open: boolean; loading: boolean; url: string; error: string }>({ open: false, loading: false, url: "", error: "" });
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekId = searchParams.get("weekId");

  useEffect(() => {
    if (!weekId) return;
    const supabase = getSupabase();
    if (!supabase) {
      const report = getLocalReport(weekId);
      if (report) applyLoadedReport(report);
      return;
    }
    supabase.from("weekly_reports").select("*").eq("week_id", weekId).single().then(({ data: report }) => {
      if (report) applyLoadedReport(report as WeeklyReport);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId]);

  function applyLoadedReport(report: WeeklyReport) {
    setStart(report.period_start);
    setEnd(report.period_end);
    setData(report.report_data);
    setFileName(`已载入 ${report.week_id}`);
  }

  const owners = useMemo(() => [...new Set(tasks.map((task) => task.owner).filter(Boolean))], [tasks]);
  const selectedTasks = useMemo(() => tasks.filter((task) => (!owner || task.owner === owner) && taskInScope(task, start, end, scope === "all")), [tasks, owner, start, end, scope]);
  const stats = useMemo(() => ({
    tasks: selectedTasks.length,
    projects: new Set(selectedTasks.map((task) => task.project)).size,
    done: selectedTasks.filter((task) => task.status === "Done").length,
    waiting: selectedTasks.filter((task) => task.status === "Waiting").length,
    delayed: selectedTasks.filter((task) => taskDelayDays(task) > 0).length,
  }), [selectedTasks]);

  async function handleFile(file?: File) {
    if (!file) return;
    try {
      const workbook = file.name.toLowerCase().endsWith(".csv")
        ? XLSX.read(await file.text(), { type: "string", cellDates: true })
        : XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: true });
      const parsed = parseExcelRows(rows);
      setTasks(parsed);
      setFileName(file.name);
      setOwner("");
      const scoped = parsed.filter((task) => taskInScope(task, start, end, scope === "all"));
      setData(generateReport(scoped, end));
    } catch {
      setPublishState({ open: true, loading: false, url: "", error: "无法读取该文件，请确认它是有效的 Excel 或 CSV 文件。" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function regenerate() {
    setData(generateReport(selectedTasks, end));
  }

  function updateRow<K extends keyof ReportData>(section: K, id: string, patch: Partial<ReportData[K][number]>) {
    setData((current) => ({ ...current, [section]: current[section].map((row) => row.id === id ? { ...row, ...patch } : row) }));
  }

  function removeRow<K extends keyof ReportData>(section: K, id: string) {
    setData((current) => ({ ...current, [section]: current[section].filter((row) => row.id !== id) }));
  }

  function addRow(section: keyof ReportData) {
    const rows = {
      results: { id: uid(), project: "", phase: "—", goal: "", actual: "—", status: "进行中", delay: "—", delayReason: "—" } as ResultRow,
      issues: { id: uid(), project: "", issue: "", progress: "—" } as IssueRow,
      nextWeek: { id: uid(), project: "", owner: "", goal: "", dueDate: "" } as NextWeekRow,
      risks: { id: uid(), project: "", risk: "", response: "—" } as RiskRow,
    };
    setData((current) => ({ ...current, [section]: [...current[section], rows[section]] } as ReportData));
  }

  async function publish() {
    setPublishState({ open: true, loading: true, url: "", error: "" });
    const id = getISOWeekId(start);
    const now = new Date().toISOString();
    const report: WeeklyReport = {
      week_id: id,
      period_start: start,
      period_end: end,
      title: "外观小组周工作汇报",
      report_data: data,
      status: "published",
      published_at: now,
      updated_at: now,
    };
    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from("weekly_reports").upsert(report, { onConflict: "week_id" });
      if (error) {
        setPublishState({ open: true, loading: false, url: "", error: `发布失败：${error.message}` });
        return;
      }
    } else {
      saveLocalReport(report);
    }
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const url = `${window.location.origin}${basePath}/weekly/?weekId=${encodeURIComponent(id)}`;
    setPublishState({ open: true, loading: false, url, error: "" });
  }

  async function exportExcel() {
    const rows: (string | number)[][] = [
      [`外观小组（${start}—${end}）周工作汇报`], [],
      ["1、本周结果"], ["项目名称", "所属阶段", "本周原计划/目标", "实际结果", "状态", "延期时间", "延期原因"],
      ...data.results.map((r) => [r.project, r.phase, r.goal, r.actual, r.status, r.delay, r.delayReason]), [],
      ["2、本周重点问题"], ["项目名称", "问题", "解决进度"], ...data.issues.map((r) => [r.project, r.issue, r.progress]), [],
      ["3、下周重点计划"], ["项目名称", "负责人", "目标", "计划完成时间"], ...data.nextWeek.map((r) => [r.project, r.owner, r.goal, r.dueDate]), [],
      ["4、风险预警"], ["项目名称", "风险", "影响/处理计划"], ...data.risks.map((r) => [r.project, r.risk, r.response]),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 44 }, { wch: 48 }, { wch: 12 }, { wch: 22 }, { wch: 34 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "周报");
    XLSX.writeFile(book, `外观小组周报_${start}_${end}.xlsx`);
    setMenuOpen(false);
  }

  if (preview) return <><AppHeader compact actions={<button className="button" onClick={() => setPreview(false)}>返回编辑</button>}/><div className="preview-ribbon">预览模式 · 内容尚未发布</div><BossReportView data={data} start={start} end={end}/></>;

  return (
    <div className="editor-shell">
      <AppHeader actions={<>
        <label className="button primary file-button"><UploadIcon/>上传任务池 Excel<input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFile(e.target.files?.[0])}/></label>
        <button className="button" onClick={() => setPreview(true)}><EyeIcon/>预览老板视角</button>
        <button className="button publish" onClick={publish}><SendIcon/>发布周报</button>
        <div className="more-wrap"><button className="icon-button" aria-label="更多操作" onClick={() => setMenuOpen((open) => !open)}><MoreIcon/></button>{menuOpen && <div className="more-menu"><button onClick={exportExcel}>导出 Excel</button><button onClick={() => router.push("/history")}>历史周报</button></div>}</div>
      </>}/>

      {!isSupabaseConfigured() && <div className="demo-banner"><b>本地演示模式</b><span>未连接 Supabase，发布内容仅保存在当前浏览器。配置环境变量后即可在线保存和分享。</span></div>}

      <main className="editor-main">
        <section className="controls-panel">
          <div className="field"><label>周开始</label><input type="date" value={start} onChange={(e) => setStart(e.target.value)}/></div>
          <div className="field"><label>周结束</label><input type="date" value={end} onChange={(e) => setEnd(e.target.value)}/></div>
          <div className="field"><label>负责人</label><select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">全部</option>{owners.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="field grow"><label>范围</label><select value={scope} onChange={(e) => setScope(e.target.value as "week" | "all")}><option value="week">本周相关 + 当前未完成</option><option value="all">全部任务</option></select></div>
          <button className="button" onClick={regenerate} disabled={!tasks.length}>重新生成</button>
          <button className="button" onClick={() => addRow("results")}>＋ 增加项目</button>
          <span className="file-name" title={fileName}>{fileName}</span>
        </section>
        <p className="rule-note">延期规则：原计划处理日作为冻结基准；未完成按当前预计处理日、已完成按完成时间计算。兼容旧字段“计划处理日”。</p>

        <section className="stats-panel">
          <Stat value={stats.tasks} label="纳入任务"/><Stat value={stats.projects} label="项目数"/><Stat value={stats.done} label="Done"/><Stat value={stats.waiting} label="Waiting"/><Stat value={stats.delayed} label="已延期" danger={stats.delayed > 0}/>
        </section>

        <div className="editor-grid">
          <aside className="task-pool panel">
            <div className="plain-title"><span>本周任务池</span><span className="count-pill">{selectedTasks.length}</span></div>
            <div className="task-list">{selectedTasks.length ? selectedTasks.map((task) => <div className="task-item" key={task.id}><strong>{task.name}</strong><div>{task.project} · {task.owner || "未指定"}</div><div><span className={`raw-status ${task.status.toLowerCase()}`}>{task.status}</span>{task.originalDate && <> · 原计划 {task.originalDate.slice(5)}</>}{task.currentExpectedDate && task.currentExpectedDate !== task.originalDate && <> · 预计 {task.currentExpectedDate.slice(5)}</>}{task.delayReason && <> · 延期：{task.delayReason}</>}</div></div>) : <div className="empty-state"><UploadIcon/><b>上传明道云任务池</b><span>支持 .xlsx、.xls 和 .csv</span></div>}</div>
          </aside>

          <div className="report-editor-column">
            <EditableSection tone="yellow" number="01" title="本周结果" hint="同项目任务自动合并，可修改">
              <div className="table-scroll"><table className="edit-table results-table"><thead><tr><th>项目名称</th><th>所属阶段</th><th>本周原计划/目标</th><th>实际结果</th><th>状态</th><th>延期时间</th><th>延期原因</th><th aria-label="操作"/></tr></thead><tbody>{data.results.map((row) => <tr key={row.id}><td><AutoTextarea value={row.project} onChange={(e) => updateRow("results", row.id, { project: e.target.value })}/></td><td><AutoTextarea value={row.phase} onChange={(e) => updateRow("results", row.id, { phase: e.target.value })}/></td><td><AutoTextarea value={row.goal} onChange={(e) => updateRow("results", row.id, { goal: e.target.value })}/></td><td><AutoTextarea value={row.actual} onChange={(e) => updateRow("results", row.id, { actual: e.target.value })}/></td><td><select value={row.status} onChange={(e) => updateRow("results", row.id, { status: e.target.value })}><option>已完成</option><option>进行中</option><option>等待中</option><option>未安排</option></select></td><td><AutoTextarea className={row.delay !== "—" ? "delay-text" : ""} value={row.delay} onChange={(e) => updateRow("results", row.id, { delay: e.target.value })}/></td><td><AutoTextarea value={row.delayReason} onChange={(e) => updateRow("results", row.id, { delayReason: e.target.value })}/></td><DeleteCell onClick={() => removeRow("results", row.id)}/></tr>)}</tbody></table>{!data.results.length && <SectionEmpty/>}</div>
            </EditableSection>

            <EditableSection tone="cyan" number="02" title="本周重点问题" hint="Waiting、延期说明自动进入候选" onAdd={() => addRow("issues")}>
              <div className="table-scroll"><table className="edit-table issues-table"><thead><tr><th>项目名称</th><th>问题</th><th>解决进度</th><th aria-label="操作"/></tr></thead><tbody>{data.issues.map((row) => <tr key={row.id}><td><AutoTextarea value={row.project} onChange={(e) => updateRow("issues", row.id, { project: e.target.value })}/></td><td><AutoTextarea value={row.issue} onChange={(e) => updateRow("issues", row.id, { issue: e.target.value })}/></td><td><AutoTextarea value={row.progress} onChange={(e) => updateRow("issues", row.id, { progress: e.target.value })}/></td><DeleteCell onClick={() => removeRow("issues", row.id)}/></tr>)}</tbody></table>{!data.issues.length && <SectionEmpty/>}</div>
            </EditableSection>

            <EditableSection tone="red" number="03" title="下周重点计划" hint="未完成任务自动进入候选" onAdd={() => addRow("nextWeek")}>
              <div className="table-scroll"><table className="edit-table plans-table"><thead><tr><th>项目名称</th><th>负责人</th><th>目标</th><th>计划完成时间</th><th aria-label="操作"/></tr></thead><tbody>{data.nextWeek.map((row) => <tr key={row.id}><td><AutoTextarea value={row.project} onChange={(e) => updateRow("nextWeek", row.id, { project: e.target.value })}/></td><td><AutoTextarea value={row.owner} onChange={(e) => updateRow("nextWeek", row.id, { owner: e.target.value })}/></td><td><AutoTextarea value={row.goal} onChange={(e) => updateRow("nextWeek", row.id, { goal: e.target.value })}/></td><td><input type="date" value={row.dueDate} onChange={(e) => updateRow("nextWeek", row.id, { dueDate: e.target.value })}/></td><DeleteCell onClick={() => removeRow("nextWeek", row.id)}/></tr>)}</tbody></table>{!data.nextWeek.length && <SectionEmpty/>}</div>
            </EditableSection>

            <EditableSection tone="gray" number="04" title="风险预警" onAdd={() => addRow("risks")}>
              <div className="table-scroll"><table className="edit-table risks-table"><thead><tr><th>项目名称</th><th>风险</th><th>影响/处理计划</th><th aria-label="操作"/></tr></thead><tbody>{data.risks.map((row) => <tr key={row.id}><td><AutoTextarea value={row.project} onChange={(e) => updateRow("risks", row.id, { project: e.target.value })}/></td><td><AutoTextarea value={row.risk} onChange={(e) => updateRow("risks", row.id, { risk: e.target.value })}/></td><td><AutoTextarea value={row.response} onChange={(e) => updateRow("risks", row.id, { response: e.target.value })}/></td><DeleteCell onClick={() => removeRow("risks", row.id)}/></tr>)}</tbody></table>{!data.risks.length && <SectionEmpty/>}</div>
            </EditableSection>
          </div>
        </div>
      </main>

      {publishState.open && <PublishDialog state={publishState} onClose={() => setPublishState((state) => ({ ...state, open: false }))}/>} 
    </div>
  );
}

function Stat({ value, label, danger }: { value: number; label: string; danger?: boolean }) { return <div className="stat"><b className={danger ? "danger-number" : ""}>{value}</b><span>{label}</span></div>; }
function EditableSection({ tone, number, title, hint, children, onAdd }: { tone: string; number: string; title: string; hint?: string; children: React.ReactNode; onAdd?: () => void }) { return <section className="panel edit-section"><div className={`edit-section-title ${tone}`}><span className="section-number">{number}</span><b>{title}</b>{hint && <span className="section-hint">{hint}</span>}{onAdd && <button onClick={onAdd}>＋ 增加</button>}</div>{children}</section>; }
function DeleteCell({ onClick }: { onClick: () => void }) { return <td className="delete-cell"><button aria-label="删除此行" onClick={onClick}><TrashIcon/></button></td>; }
function SectionEmpty() { return <div className="section-empty">暂无内容</div>; }

function PublishDialog({ state, onClose }: { state: { loading: boolean; url: string; error: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(state.url); setCopied(true); }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !state.loading) onClose(); }}><section className="publish-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title">
    {state.loading ? <><div className="spinner large"/><h2 id="publish-title">正在发布周报</h2><p>正在保存本周正式快照…</p></> : state.error ? <><div className="dialog-icon error">!</div><h2 id="publish-title">未能发布</h2><p className="dialog-error">{state.error}</p><button className="button primary wide" onClick={onClose}>返回编辑</button></> : <><div className="dialog-icon success"><CheckIcon/></div><h2 id="publish-title">周报已发布</h2><p>{isSupabaseConfigured() ? "正式快照已保存，可将下面的链接发给老板。" : "演示快照已保存到当前浏览器。配置 Supabase 后可跨设备分享。"}</p><div className="share-link"><span>{state.url}</span><button onClick={copy} aria-label="复制链接">{copied ? <CheckIcon/> : <CopyIcon/>}</button></div><div className="dialog-actions"><button className="button" onClick={onClose}>继续编辑</button><a className="button primary" href={state.url} target="_blank" rel="noreferrer">查看周报</a></div></>}
  </section></div>;
}
