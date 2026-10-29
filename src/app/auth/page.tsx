import { AuthPanel } from "@/components/auth/auth-panel";

export default function AuthPage() {
  return (
    <main className="auth-page">
      <div className="auth-intro">
        <span className="brand-mark">WK</span>
        <p className="eyebrow">DAILY VOCABULARY SYSTEM</p>
        <h2>把每天的词汇，变成看得见的进步。</h2>
        <p>记忆、测试、错题回顾和连续打卡，都从一个学习账号开始。</p>
      </div>
      <AuthPanel />
    </main>
  );
}
