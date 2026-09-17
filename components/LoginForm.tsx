"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getSupabase()?.auth.getUser().then(({ data }) => { if (data.user) router.replace("/editor"); });
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = getSupabase();
    if (!supabase) { router.push("/editor"); return; }
    setLoading(true); setError("");
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) setError("邮箱或密码不正确，请重试。");
    else router.replace("/editor");
  }

  return <main className="login-page"><section className="login-card"><div className="login-brand"><span className="brand-mark">外</span><div><b>外观小组 · 周报</b><small>编辑工作台</small></div></div><div className="login-copy"><span className="eyebrow">EDITOR ACCESS</span><h1>登录编辑端</h1><p>上传任务池、整理周报并发布正式快照。</p></div>
    {!isSupabaseConfigured() && <div className="login-demo"><b>本地演示模式</b><span>当前未配置 Supabase，可直接进入工作台体验。</span></div>}
    <form onSubmit={submit}><label>邮箱<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required={isSupabaseConfigured()}/></label><label>密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入密码" required={isSupabaseConfigured()}/></label>{error && <p className="form-error">{error}</p>}<button className="button primary wide" disabled={loading}>{loading ? "正在登录…" : isSupabaseConfigured() ? "登录" : "进入演示工作台"}</button></form><Link className="public-link" href="/weekly">查看最新周报 →</Link>
  </section><aside className="login-visual"><div className="visual-sheet"><div className="sheet-top"><span>WEEKLY REPORT</span><b>38</b></div><div className="visual-line long"/><div className="visual-line"/><div className="visual-grid"><i/><i/><i/></div><div className="visual-line medium"/></div><div className="visual-caption"><b>任务池 → 项目周报</b><span>把碎片化过程信息，整理成清晰的管理汇报。</span></div></aside></main>;
}
