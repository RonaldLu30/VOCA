"use client";

import { FormEvent, useState } from "react";
import {
  AUTH_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  AuthMode,
  StoredAccount,
} from "@/lib/auth/types";

const defaultForm = { username: "", phone: "", password: "", confirmPassword: "" };

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [session, setSession] = useState<StoredAccount | null>(() => {
    if (typeof window === "undefined") return null;
    const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? (JSON.parse(rawSession) as StoredAccount) : null;
  });

  function updateField(field: keyof typeof defaultForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = form.username.trim();
    const phone = form.phone.trim();
    const password = form.password;

    if (!username || !phone || !password) {
      setMessage("请填写用户名、手机号和密码。");
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      setMessage("请输入 11 位手机号。");
      return;
    }
    if (password.length < 6) {
      setMessage("密码至少需要 6 位。");
      return;
    }

    const rawAccount = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const account = rawAccount ? (JSON.parse(rawAccount) as StoredAccount) : null;

    if (mode === "register") {
      if (form.password !== form.confirmPassword) {
        setMessage("两次输入的密码不一致。");
        return;
      }
      if (account && (account.username === username || account.phone === phone)) {
        setMessage("用户名或手机号已注册。");
        return;
      }
      const newAccount: StoredAccount = { username, phone, password, createdAt: new Date().toISOString() };
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAccount));
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newAccount));
      setSession(newAccount);
      setMessage("注册成功，当前设备已保持登录。");
      return;
    }

    if (!account || (account.username !== username && account.phone !== phone) || account.password !== password) {
      setMessage("用户名、手机号或密码不正确。");
      return;
    }
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(account));
    setSession(account);
    setMessage("登录成功，当前设备已保持登录。");
  }

  function logout() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setMessage("已退出登录。");
  }

  if (session) {
    return (
      <section className="auth-card">
        <p className="eyebrow">WORDKILLER ACCOUNT</p>
        <h1>欢迎回来，{session.username}</h1>
        <p className="auth-muted">账号已在此设备保持登录。连接云端后，学习进度也会在设备间同步。</p>
        <button className="auth-primary" type="button" onClick={logout}>退出登录</button>
        {message && <p className="auth-message">{message}</p>}
      </section>
    );
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">WORDKILLER ACCOUNT</p>
      <h1>{mode === "login" ? "继续你的单词计划" : "创建学习账号"}</h1>
      <p className="auth-muted">用户名和手机号共同作为账号身份，不需要短信验证码。</p>
      <div className="auth-tabs" role="tablist" aria-label="账号操作">
        <button className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("login")} type="button">登录</button>
        <button className={mode === "register" ? "auth-tab active" : "auth-tab"} onClick={() => setMode("register")} type="button">注册</button>
      </div>
      <form onSubmit={submit} className="auth-form">
        <label>用户名<input value={form.username} onChange={(event) => updateField("username", event.target.value)} autoComplete="username" /></label>
        <label>手机号<input value={form.phone} onChange={(event) => updateField("phone", event.target.value)} inputMode="numeric" autoComplete="tel" /></label>
        <label>密码<input value={form.password} onChange={(event) => updateField("password", event.target.value)} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {mode === "register" && <label>确认密码<input value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} type="password" autoComplete="new-password" /></label>}
        <button className="auth-primary" type="submit">{mode === "login" ? "登录" : "注册并开始学习"}</button>
      </form>
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  );
}
