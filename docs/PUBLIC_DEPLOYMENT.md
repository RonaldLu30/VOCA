# Voca！公开发布方案

## 推荐架构

- **Vercel**：部署 Next.js 网站，绑定 GitHub `main` 分支，自动发布。
- **Supabase**：托管 PostgreSQL、用户账号、行级权限和数据库备份。
- **Dictionary API**：由 Next.js 服务端路由代理，浏览器不直接暴露第三方服务配置。
- **对象存储**：词汇文件先放 Supabase Storage，解析后的词条写入数据库。

## 上线步骤

1. 在 Supabase 创建项目，打开 SQL Editor，执行 `supabase/schema.sql`。
2. 在 Supabase Authentication 中开启 Email 登录；手机号作为资料字段保存。若以后需要短信验证，再开启 Phone Provider。
3. 在 Vercel 连接 `RonaldLu30/VOCA`，Production Branch 选择 `main`。
4. 在 Vercel Environment Variables 填入 `.env.example` 中的变量。`SUPABASE_SERVICE_ROLE_KEY` 只允许服务端使用，不能写入 `NEXT_PUBLIC_*`。
5. 部署后配置 Supabase Authentication 的 Site URL 为 Vercel 域名，并加入回调地址。

## 账号策略

公开版不再把密码放在 `localStorage`。注册、登录和会话由 Supabase Auth 管理，浏览器只保存安全会话 Cookie。用户名在 `profiles` 表唯一，手机号可作为资料字段；找回密码使用邮箱链接。

## 数据安全

- 所有业务表启用 RLS，用户只能读取自己的词汇、作答和打卡数据。
- 服务端密钥只放在 Vercel 环境变量中。
- Supabase 自动备份数据库；重要版本可定期导出 SQL。
- 生产环境使用 HTTPS、限制上传文件大小，并对 PDF、Excel、Word 解析设置超时。

## 当前实现

- 邮箱注册、登录、找回密码使用 Supabase Auth；注册时由数据库触发器创建 `profiles` 记录。
- TXT、CSV 和粘贴内容写入云端词表；测试记录、错题、打卡和能量读取云端数据。
- PDF、Excel、Word 文档解析仍未接入；这些格式不会被当作成功导入。
- 首次部署后，将 Vercel 域名加入 Supabase Authentication 的 Site URL 与 Redirect URLs，再验证邮箱注册和找回密码。
