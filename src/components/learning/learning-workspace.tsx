"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { matchesAnswer } from "@/lib/answer-matcher";
import { VocabularyEntry } from "@/lib/domain";

const demoEntries: VocabularyEntry[] = [
  { id: "abandon", phrase: "abandon", meanings: ["放弃", "遗弃"], phonetic: "/əˈbændən/", partOfSpeech: "verb", synonyms: ["give up", "desert"], antonyms: ["keep"], example: "He abandoned his plan.", memoryTip: "把 a band（一个乐队）丢下，联想为放弃。" },
  { id: "accurate", phrase: "accurate", meanings: ["准确的", "精确的"], phonetic: "/ˈækjərət/", partOfSpeech: "adjective", synonyms: ["precise", "exact"], antonyms: ["wrong"], example: "The report is accurate.", memoryTip: "acu- 有尖锐、精确的感觉。" },
  { id: "take-advantage", phrase: "take advantage of", meanings: ["利用", "占便宜"], phonetic: "/teɪk ədˈvæntɪdʒ əv/", partOfSpeech: "phrase", synonyms: ["make use of"], antonyms: [], example: "Take advantage of this opportunity.", memoryTip: "把优势 advantage 拿过来使用。" },
];

type Result = { answer: string; correct: boolean };

export function LearningWorkspace() {
  const router = useRouter();
  const [mode, setMode] = useState<"memory" | "test">("test");
  const [index, setIndex] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem("wordkiller-test-index") ?? 0);
  });
  const [showDetails, setShowDetails] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [correctStreak, setCorrectStreak] = useState<Record<string, number>>({});
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const current = demoEntries[index];
  const acceptedAnswers = useMemo(() => [current.phrase, ...current.synonyms], [current]);

  function next() {
    setIndex((value) => {
      const nextIndex = (value + 1) % demoEntries.length;
      window.localStorage.setItem("wordkiller-test-index", String(nextIndex));
      return nextIndex;
    });
    setAnswer("");
    setResult(null);
    setShowDetails(false);
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!answer.trim() || result) return;
    const correct = matchesAnswer(answer, acceptedAnswers);
    setResult({ answer, correct });
    setCorrectStreak((previous) => ({ ...previous, [current.id]: correct ? (previous[current.id] ?? 0) + 1 : 0 }));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <button type="button" onClick={() => setShowLeaveDialog(true)} className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-700">← 返回主页</button>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">WordKiller · 今日学习</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">记住每一个词，再把它写出来</h1>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs text-slate-400">今日进度</p>
            <p className="text-2xl font-bold text-indigo-600">{index + (result ? 1 : 0)} / {demoEntries.length}</p>
          </div>
        </header>
        {mode === "memory" ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">词条 {index + 1}</span>
              <button type="button" onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(current.phrase))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">🔊 播放发音</button>
            </div>
            <p className="text-5xl font-bold tracking-tight sm:text-7xl">{current.phrase}</p>
            <p className="mt-4 font-mono text-lg text-indigo-600">{current.phonetic}</p>
            <p className="mt-8 text-2xl font-semibold text-slate-700">{current.meanings.join("；")}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">同义词</p><p className="mt-2 text-slate-700">{current.synonyms.join(" · ")}</p></div>
              <div className="rounded-2xl bg-amber-50 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-amber-600">记忆方法</p><p className="mt-2 text-amber-900">{current.memoryTip}</p></div>
            </div>
            <button type="button" onClick={() => setShowDetails((value) => !value)} className="mt-6 text-sm font-semibold text-indigo-600">{showDetails ? "收起例句" : "查看例句和用法"}</button>
            {showDetails && <p className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-950">{current.example}</p>}
            <button type="button" onClick={() => { setMode("test"); setResult(null); }} className="mt-8 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800">开始测试</button>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="mb-8 flex items-center justify-between"><span className="text-sm font-semibold text-slate-400">第 {index + 1} 题</span><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">中文提示</span></div>
            <p className="text-3xl font-bold tracking-tight sm:text-5xl">{current.meanings.join("；")}</p>
            <p className="mt-3 text-sm text-slate-400">输入英文单词或短语，按 Shift + Enter 提交</p>
            <form onSubmit={submit} className="mt-8">
              <input autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={handleKeyDown} disabled={Boolean(result)} placeholder="输入英文答案" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xl outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:opacity-70" />
              <button type="submit" disabled={!answer.trim() || Boolean(result)} className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200">确认答案</button>
            </form>
            {result && <div className={`mt-6 rounded-2xl p-5 ${result.correct ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}><p className="text-lg font-bold">{result.correct ? "回答正确" : "再记一次"}</p><p className="mt-2 text-sm">你的答案：{result.answer}</p><p className="text-sm">正确答案：{current.phrase}</p><p className="mt-2 text-xs">连续答对：{correctStreak[current.id] ?? 0} 次（达到 3 次后标记为已掌握）</p><button type="button" onClick={next} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm">下一题</button></div>}
          </section>
        )}
        {showLeaveDialog && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-5"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><h2 className="text-xl font-bold text-slate-900">确认离开测试？</h2><p className="mt-3 leading-7 text-slate-600">还有 <strong className="text-indigo-600">{Math.max(demoEntries.length - index - (result ? 1 : 0), 0)}</strong> 个单词就完成任务了，确认离开吗？</p><p className="mt-2 text-sm text-slate-400">如果离开再回来，当前进度也不会改变。</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowLeaveDialog(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">继续测试</button><button type="button" onClick={() => router.push("/")} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">确认离开</button></div></div></div>}
      </div>
    </main>
  );
}
