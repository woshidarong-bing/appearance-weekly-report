"use client";

import Link from "next/link";

export default function AppHeader({ actions, compact = false }: { actions?: React.ReactNode; compact?: boolean }) {
  const identity = <><span className="brand-mark">外</span><span>外观小组 · 周报</span></>;
  return (
    <header className={`app-header ${compact ? "compact" : ""}`}>
      <div className="topbar">
        {compact ? <div className="brand">{identity}</div> : <Link href="/editor" className="brand">{identity}</Link>}
        {actions && <div className="header-actions">{actions}</div>}
      </div>
    </header>
  );
}
