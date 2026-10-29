"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

type ConfirmationStatus = "checking" | "confirmed" | "error";

function getConfirmationStatus(): ConfirmationStatus {
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (query.has("error") || query.has("error_code") || fragment.has("error")) return "error";
  return query.has("code") || fragment.has("access_token") ? "confirmed" : "error";
}

const subscribe = () => () => {};

export default function ConfirmedPage() {
  const status = useSyncExternalStore(subscribe, getConfirmationStatus, () => "checking");

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">VOCA！ACCOUNT</p>
        <h1>{status === "checking" ? "正在检查确认链接…" : status === "confirmed" ? "邮箱确认成功" : "确认链接无效或已过期"}</h1>
        <p className="auth-muted">{status === "confirmed" ? "邮箱已确认，现在可以使用注册时设置的密码登录。" : status === "error" ? "请返回登录页重新注册，或联系管理员。" : ""}</p>
        {status !== "checking" && <Link className="auth-primary inline-block" href="/auth">前往登录</Link>}
      </section>
    </main>
  );
}
