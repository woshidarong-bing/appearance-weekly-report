import { Suspense } from "react";
import ReportEditor from "@/components/ReportEditor";

export default function EditorPage() {
  return <Suspense fallback={<div className="center-state"><div className="spinner"/><p>正在打开编辑工作台…</p></div>}><ReportEditor/></Suspense>;
}
