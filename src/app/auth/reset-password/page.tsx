"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : "密码已更新，请返回登录。");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>设置新密码</h1>
        <form onSubmit={submit} className="auth-form">
          <label>新密码<input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="auth-primary" type="submit">更新密码</button>
        </form>
        {message && <p className="auth-message" role="status">{message}</p>}
        <Link href="/auth">返回登录</Link>
      </section>
    </main>
  );
}
