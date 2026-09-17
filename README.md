# 外观小组周报 Web App

基于现有 v2.6 单文件原型迁移的 Next.js 应用。支持明道云 Excel 导入、按项目归并、人工编辑、老板视角预览、发布固定链接与历史周报。

## 本地运行

```bash
pnpm install
pnpm dev
```

未配置 Supabase 时会进入本地演示模式，数据仅保存在当前浏览器。

## Supabase 配置

1. 新建 Supabase 项目，在 SQL Editor 执行 `supabase/schema.sql`。
2. 在 Authentication 中为编辑者创建邮箱账号；不要开放匿名注册。
3. 复制 `.env.example` 为 `.env.local`，填写项目 URL 和 publishable key。旧项目的 legacy anon key 也兼容。
4. 重启开发服务。

公开访问只允许读取 `status = published` 的周报；编辑、发布和历史管理要求已登录账号。

## 部署到 Vercel

项目包含 GitHub Pages 自动部署工作流。将仓库设为公开，在 Actions secrets 中配置与 `.env.example` 相同的两个环境变量，再在 Pages 中选择 GitHub Actions 作为发布源即可部署。`/weekly/` 是长期分享地址，`/weekly/?weekId=YYYY-wWW` 是每期固定快照地址。
