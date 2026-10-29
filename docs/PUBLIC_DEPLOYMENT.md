# Voca！公开发布方案

## 推荐架构

- **Vercel**：部署 Next.js 网站，绑定 GitHub `main` 分支，自动发布。
- **Supabase**：托管 PostgreSQL、用户账号、行级权限和数据库备份。
- **Dictionary API**：由 Next.js 服务端路由代理，浏览器不直接暴露第三方服务配置。
- **对象存储**：词汇文件先放 Supabase Storage，解析后的词条写入数据库。

## 上线步骤

1. 在 Supabase 创建项目，打开 SQL Editor，执行 `supabase/schema.sql`。
2. 在 Supabase Authentication 中开启 Email 登录；手机号作为资料字段保存。若以后需要短信验证，再开启 Phone Provider。
3. 在 Vercel 导入 `RonaldLu30/wordkiller`，Production Branch 选择 `main`。
4. 在 Vercel Environment Variables 填入 `.env.example` 中的变量。`SUPABASE_SERVICE_ROLE_KEY` 只允许服务端使用，不能写入 `NEXT_PUBLIC_*`。
5. 部署后配置 Supabase Authentication 的 Site URL 为 Vercel 域名，并加入回调地址。

## 账号策略

公开版不再把密码放在 `localStorage`。注册、登录和会话由 Supabase Auth 管理，浏览器只保存安全会话 Cookie。用户名在 `profiles` 表唯一，手机号可作为资料字段；找回密码使用邮箱链接。

## 数据安全

- 所有业务表启用 RLS，用户只能读取自己的词汇、作答和打卡数据。
- 服务端密钥只放在 Vercel 环境变量中。
- Supabase 自动备份数据库；重要版本可定期导出 SQL。
- 生产环境使用 HTTPS、限制上传文件大小，并对 PDF、Excel、Word 解析设置超时。

## 当前代码迁移顺序

1. 接入 Supabase SSR 客户端。
2. 将注册/登录页替换为 Supabase Auth。
3. 将首页词汇导入写入 `vocabulary_lists` 与 `vocabulary_entries`。
4. 将测试记录、错题和能量写入 `study_records` 与 `study_days`。
5. 在 Vercel Preview 环境验收后切换 Production 域名。
