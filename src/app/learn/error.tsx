"use client";

import Link from "next/link";

export default function LearnError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="min-h-screen bg-[#f7f8fc] px-5 py-12 text-slate-900">
    <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">学习页面暂时无法打开</h1>
      <p className="mt-3 text-slate-600">请重试加载；如果问题持续，可以先返回主页。</p>
      {error.digest && <p className="mt-3 text-xs text-slate-400">错误编号：{error.digest}</p>}
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={retry} className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white">重试</button><button onClick={() => window.location.reload()} className="rounded-xl border border-indigo-200 px-5 py-3 font-semibold text-indigo-700">刷新页面</button><Link href="/" className="rounded-xl border border-slate-200 px-5 py-3 font-semibold">返回主页</Link></div>
    </div>
  </main>;
}
