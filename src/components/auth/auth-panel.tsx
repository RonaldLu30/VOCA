"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthMode, UserIdentity } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const defaultForm = { username: "", phone: "", email: "", password: "", confirmPassword: "" };

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [session, setSession] = useState<UserIdentity | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.localStorage.removeItem("wordkiller.auth.account");
    window.localStorage.removeItem("wordkiller.auth.session");
    let active = true;
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase.from("profiles").select("username, phone").eq("id", user.id).single();
      if (active) setSession({ id: user.id, username: data?.username ?? user.email ?? "用户", phone: data?.phone ?? null });
    }
    void loadProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { void loadProfile(); }, 0); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  function updateField(field: keyof typeof defaultForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setMessage("请填写邮箱和密码。");
      return;
    }
    if (mode === "register" && (!form.username.trim() || !/^1\d{10}$/.test(form.phone))) {
      setMessage("请填写用户名和 11 位手机号。");
      return;
    }
    if (mode === "register" && form.password !== form.confirmPassword) {
      setMessage("两次输入的密码不一致。");
      return;
    }
    setBusy(true);
    const result = mode === "register"
      ? await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirmed`,
            data: { username: form.username.trim(), phone: form.phone.trim() },
          },
        })
      : await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "register" && !result.data.session) {
      setMessage("注册成功，请点击邮件中的链接确认邮箱。");
      return;
    }
    router.push("/");
  }

  async function resetPassword() {
    if (!form.email.trim()) {
      setMessage("请先填写邮箱。");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setMessage(error ? error.message : "密码重置链接已发送，请检查邮箱。");
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setMessage("已退出登录。");
  }

  if (session) {
    return (
      <section className="auth-card">
        <p className="eyebrow">VOCA！ACCOUNT</p>
        <h1>欢迎回来，{session.username}</h1>
        <p className="auth-muted">学习记录将保存在云端账号中。</p>
        <button className="auth-primary" type="button" onClick={logout}>退出登录</button>
        {message && <p className="auth-message">{message}</p>}
      </section>
    );
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">VOCA！ACCOUNT</p>
      <h1>{mode === "login" ? "继续你的单词计划" : "创建学习账号"}</h1>
      <p className="auth-muted">使用邮箱登录；用户名和手机号保存在账号资料中。</p>
      <div className="auth-tabs" role="tablist" aria-label="账号操作">
        <button className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("login")} type="button">登录</button>
        <button className={mode === "register" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("register")} type="button">注册</button>
      </div>
      <form onSubmit={submit} className="auth-form">
        {mode === "register" && <label>用户名<input value={form.username} onChange={(event) => updateField("username", event.target.value)} autoComplete="username" required /></label>}
        {mode === "register" && <label>手机号<input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} inputMode="numeric" autoComplete="tel" required /></label>}
        <label>邮箱<input value={form.email} onChange={(event) => updateField("email", event.target.value)} type="email" autoComplete="email" required /></label>
        <label>密码<input value={form.password} onChange={(event) => updateField("password", event.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
        {mode === "register" && <label>确认密码<input value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} type="password" autoComplete="new-password" required /></label>}
        <button className="auth-primary" type="submit" disabled={busy}>{busy ? "处理中…" : mode === "login" ? "登录" : "注册并开始学习"}</button>
      </form>
      {mode === "login" && <button className="mt-3 text-sm text-indigo-600" type="button" onClick={resetPassword}>忘记密码？</button>}
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  );
}
