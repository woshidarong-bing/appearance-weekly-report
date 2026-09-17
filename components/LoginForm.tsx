"use client";

import Link from "next/link";

export default function LoginForm() {
  return <main className="login-page"><section className="login-card"><div className="login-brand"><span className="brand-mark">外</span><div><b>外观小组 · 周报</b><small>编辑工作台</small></div></div><div className="login-copy"><span className="eyebrow">EDITOR ACCESS</span><h1>进入编辑端</h1><p>无需账号和密码，直接上传任务池、整理并发布周报。</p></div>
    <Link className="button primary wide" href="/editor">直接进入编辑工作台</Link><Link className="public-link" href="/weekly">查看最新周报 →</Link>
  </section><aside className="login-visual"><div className="visual-sheet"><div className="sheet-top"><span>WEEKLY REPORT</span><b>38</b></div><div className="visual-line long"/><div className="visual-line"/><div className="visual-grid"><i/><i/><i/></div><div className="visual-line medium"/></div><div className="visual-caption"><b>任务池 → 项目周报</b><span>把碎片化过程信息，整理成清晰的管理汇报。</span></div></aside></main>;
}
