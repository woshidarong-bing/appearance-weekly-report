"use client";

import { formatPeriodDate } from "@/lib/date";
import type { ReportData } from "@/lib/types";

function StatusBadge({ status }: { status: string }) {
  const key = status === "已完成" ? "done" : status === "等待中" ? "waiting" : status === "未安排" ? "inbox" : "today";
  return <span className={`status-badge ${key}`}>{status}</span>;
}

function EmptyDash({ value }: { value: string }) {
  return <>{value?.trim() || "—"}</>;
}

export default function BossReportView({ data, start, end }: { data: ReportData; start: string; end: string }) {
  const sections = [data.results.length, data.issues.length, data.nextWeek.length, data.risks.length];
  return (
    <main className="boss-page">
      <section className="report-hero">
        <div className="report-kicker">外观小组</div>
        <h1>周工作汇报</h1>
        <div className="report-period">{formatPeriodDate(start)}—{formatPeriodDate(end)}</div>
      </section>

      {!sections.some(Boolean) && <div className="no-report-content">本期周报暂无内容</div>}

      {data.results.length > 0 && (
        <ReportSection tone="yellow" number="01" title="本周结果">
          <div className="desktop-report-table">
            <table className="boss-results"><thead><tr><th>项目名称</th><th>所属阶段</th><th>本周原计划/目标</th><th>实际结果</th><th>状态</th><th>延期时间</th><th>延期原因</th></tr></thead>
              <tbody>{data.results.map((row) => <tr key={row.id}><td className="project-cell">{row.project}</td><td><EmptyDash value={row.phase}/></td><td>{row.goal}</td><td>{row.actual}</td><td><StatusBadge status={row.status}/></td><td className={row.delay !== "—" ? "delay-text" : ""}><EmptyDash value={row.delay}/></td><td><EmptyDash value={row.delayReason}/></td></tr>)}</tbody>
            </table>
          </div>
          <div className="mobile-report-cards">{data.results.map((row) => <article className="report-card" key={row.id}><div className="report-card-head"><h3>{row.project}</h3><StatusBadge status={row.status}/></div><CardField label="所属阶段" value={row.phase}/><CardField label="本周原计划/目标" value={row.goal}/><CardField label="实际结果" value={row.actual}/><CardField label="延期" value={row.delay} danger={row.delay !== "—"}/><CardField label="延期原因" value={row.delayReason}/></article>)}</div>
        </ReportSection>
      )}

      {data.issues.length > 0 && (
        <ReportSection tone="cyan" number="02" title="本周重点问题">
          <SimpleReportTable headers={["项目名称", "问题", "解决进度"]} rows={data.issues.map((row) => [row.project, row.issue, row.progress])}/>
          <MobileSimpleCards rows={data.issues.map((row) => ({ id: row.id, title: row.project, fields: [["问题", row.issue], ["解决进度", row.progress]] }))}/>
        </ReportSection>
      )}

      {data.nextWeek.length > 0 && (
        <ReportSection tone="red" number="03" title="下周重点计划">
          <SimpleReportTable headers={["项目名称", "负责人", "目标", "计划完成时间"]} rows={data.nextWeek.map((row) => [row.project, row.owner, row.goal, row.dueDate])}/>
          <MobileSimpleCards rows={data.nextWeek.map((row) => ({ id: row.id, title: row.project, fields: [["负责人", row.owner], ["目标", row.goal], ["计划完成时间", row.dueDate]] }))}/>
        </ReportSection>
      )}

      {data.risks.length > 0 && (
        <ReportSection tone="gray" number="04" title="风险预警">
          <SimpleReportTable headers={["项目名称", "风险", "影响/处理计划"]} rows={data.risks.map((row) => [row.project, row.risk, row.response])}/>
          <MobileSimpleCards rows={data.risks.map((row) => ({ id: row.id, title: row.project, fields: [["风险", row.risk], ["影响/处理计划", row.response]] }))}/>
        </ReportSection>
      )}
    </main>
  );
}

function ReportSection({ tone, number, title, children }: { tone: string; number: string; title: string; children: React.ReactNode }) {
  return <section className="boss-section"><div className={`boss-section-title ${tone}`}><span>{number}</span><h2>{title}</h2></div>{children}</section>;
}

function SimpleReportTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="desktop-report-table"><table className="boss-simple"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className={cellIndex === 0 ? "project-cell" : ""}><EmptyDash value={cell}/></td>)}</tr>)}</tbody></table></div>;
}

function CardField({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div className="card-field"><div className="card-label">{label}</div><div className={danger ? "delay-text" : ""}><EmptyDash value={value}/></div></div>;
}

function MobileSimpleCards({ rows }: { rows: { id: string; title: string; fields: string[][] }[] }) {
  return <div className="mobile-report-cards">{rows.map((row) => <article className="report-card" key={row.id}><div className="report-card-head"><h3>{row.title}</h3></div>{row.fields.map(([label, value]) => <CardField key={label} label={label} value={value}/>)}</article>)}</div>;
}
