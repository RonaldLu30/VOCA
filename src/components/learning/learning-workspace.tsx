"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { matchesAnswer } from "@/lib/answer-matcher";
import { VocabularyEntry } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";
import { isVocabularyTerm, parseVocabularyText } from "@/lib/vocabulary-parser";

const supabase = createClient();

const demoEntries: VocabularyEntry[] = [
  { id: "abandon", phrase: "abandon", meanings: ["放弃", "遗弃"], phonetic: "/əˈbændən/", partOfSpeech: "verb", synonyms: ["give up", "desert"], antonyms: ["keep"], example: "He abandoned his plan.", memoryTip: "把 a band（一个乐队）丢下，联想为放弃。" },
  { id: "accurate", phrase: "accurate", meanings: ["准确的", "精确的"], phonetic: "/ˈækjərət/", partOfSpeech: "adjective", synonyms: ["precise", "exact"], antonyms: ["wrong"], example: "The report is accurate.", memoryTip: "acu- 有尖锐、精确的感觉。" },
  { id: "take-advantage", phrase: "take advantage of", meanings: ["利用", "占便宜"], phonetic: "/teɪk ədˈvæntɪdʒ əv/", partOfSpeech: "phrase", synonyms: ["make use of"], antonyms: [], example: "Take advantage of this opportunity.", memoryTip: "把优势 advantage 拿过来使用。" },
];

type Result = { answer: string; correct: boolean };
type DayList = { id: string; day_number: number; created_at: string };
type CloudEntry = VocabularyEntry & { listId: string };

export function LearningWorkspace({ initialMode }: { initialMode: "memory" | "test" }) {
  const router = useRouter();
  const mode = initialMode;
  const [index, setIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudEntries, setCloudEntries] = useState<CloudEntry[]>([]);
  const [dayLists, setDayLists] = useState<DayList[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | "today">("today");
  const [started, setStarted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [correctStreak, setCorrectStreak] = useState<Record<string, number>>({});
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem("voca-starred-words");
    return stored ? JSON.parse(stored) as string[] : [];
  });
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [testQueue, setTestQueue] = useState<VocabularyEntry[]>([]);
  const [retryRounds, setRetryRounds] = useState<Record<string, number>>({});
  const answerInputRef = useRef<HTMLInputElement>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const todayDay = dayLists[0]?.day_number;
  const dayNumbers = [...new Set(dayLists.map((list) => list.day_number))].sort((left, right) => left - right);
  const activeDay = selectedDay === "today" ? todayDay : selectedDay;
  const selectedListIds = new Set(dayLists.filter((list) => list.day_number === activeDay).map((list) => list.id));
  const entries = userId ? cloudEntries.filter((entry) => selectedListIds.has(entry.listId)) : demoEntries;
  const memoryEntries = showStarredOnly ? entries.filter((entry) => starredIds.includes(entry.id)) : entries;
  const current = mode === "test" && started ? testQueue[index] : memoryEntries[index];
  const acceptedAnswers = useMemo(() => current ? [current.phrase, ...current.synonyms] : [], [current]);

  useEffect(() => {
    let active = true;
    async function loadWords() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (user) {
        setUserId(user.id);
        const [words, answers, lists] = await Promise.all([
          supabase.from("vocabulary_entries")
            .select("id, list_id, term, meaning, phonetic, part_of_speech, synonyms, example, memory_tip")
            .eq("user_id", user.id).order("created_at", { ascending: false }),
          supabase.from("study_records")
            .select("vocabulary_id, consecutive_correct")
            .eq("user_id", user.id).order("answered_at", { ascending: true }),
          supabase.from("vocabulary_lists")
            .select("id, day_number, created_at")
            .eq("user_id", user.id).order("created_at", { ascending: false }),
        ]);
        if (active) setCloudEntries((words.data ?? []).flatMap((entry) => {
          const parsed = parseVocabularyText(`${entry.term}\t${entry.meaning}`)[0];
          if (!parsed) return [];
          const synonyms = [...new Set([...(entry.synonyms ?? []).flatMap((value: string) => value.split(/[,，;；、/]/)), ...parsed.synonyms]
            .map((value: string) => value.trim()).filter(isVocabularyTerm))];
          return [{
            id: entry.id, listId: entry.list_id, phrase: parsed.term,
            meanings: parsed.meaning.split(/[；;、]/).map((value: string) => value.trim()).filter(Boolean),
            phonetic: entry.phonetic ?? undefined, partOfSpeech: entry.part_of_speech ?? undefined,
            synonyms, antonyms: [], example: entry.example ?? undefined, memoryTip: entry.memory_tip ?? undefined,
          }];
        }));
        if (active) setDayLists(lists.data ?? []);
        if (active) setCorrectStreak(Object.fromEntries((answers.data ?? []).map((record) => [record.vocabulary_id, record.consecutive_correct])));
      }
      if (active) setLoaded(true);
    }
    void loadWords();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mode === "test" && started && !result) answerInputRef.current?.focus();
  }, [mode, started, index, result]);

  function next() {
    setIndex((value) => {
      const length = mode === "test" ? testQueue.length : memoryEntries.length;
      return length ? (value + 1) % length : 0;
    });
    setAnswer("");
    setResult(null);
    setShowDetails(false);
  }

  function previous() {
    const length = mode === "test" ? testQueue.length : memoryEntries.length;
    setIndex((value) => length ? (value - 1 + length) % length : 0);
    setAnswer("");
    setResult(null);
    setShowDetails(false);
  }

  function selectDay(day: number | "today") {
    setSelectedDay(day);
    setStarted(false);
    setIndex(0);
    setAnswer("");
    setResult(null);
    setTestQueue([]);
    setRetryRounds({});
  }

  function toggleStar(entry: VocabularyEntry) {
    setStarredIds((previous) => {
      const next = previous.includes(entry.id) ? previous.filter((id) => id !== entry.id) : [...previous, entry.id];
      localStorage.setItem("voca-starred-words", JSON.stringify(next));
      return next;
    });
  }

  function beginStudy() {
    setIndex(0);
    setRetryRounds({});
    setTestQueue(mode === "test" ? [...entries] : []);
    setStarted(true);
  }

  function insertRetry(entry: VocabularyEntry) {
    setTestQueue((queue) => {
      const next = [...queue];
      const position = Math.min(next.length, index + 1 + Math.floor(Math.random() * Math.max(next.length - index, 1)));
      next.splice(position, 0, entry);
      return next;
    });
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!answer.trim() || result) return;
    const correct = matchesAnswer(answer, acceptedAnswers);
    const previousRetryRound = retryRounds[current.id];
    const nextRetryRound = correct ? (previousRetryRound ?? 0) + 1 : 0;
    setResult({ answer, correct });
    setCorrectStreak((previous) => ({ ...previous, [current.id]: correct ? (previous[current.id] ?? 0) + 1 : 0 }));
    if (!correct) {
      setRetryRounds((previous) => ({ ...previous, [current.id]: 0 }));
      insertRetry(current);
    } else if (previousRetryRound !== undefined && nextRetryRound < 3) {
      setRetryRounds((previous) => ({ ...previous, [current.id]: nextRetryRound }));
      insertRetry(current);
    } else if (previousRetryRound !== undefined) {
      setRetryRounds((previous) => { const next = { ...previous }; delete next[current.id]; return next; });
    }
    if (userId) {
      const consecutiveCorrect = correct ? (correctStreak[current.id] ?? 0) + 1 : 0;
      const { error } = await supabase.from("study_records").insert({
        user_id: userId, vocabulary_id: current.id, answer, correct, consecutive_correct: consecutiveCorrect,
        status: consecutiveCorrect >= 3 ? "mastered" : "learning",
      });
      if (error) setSaveError(error.message);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.shiftKey && result) {
      event.preventDefault();
      next();
      return;
    }
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  if (!loaded) return <main className="p-8">正在加载词汇…</main>;
  if (userId && !dayNumbers.length) return <main className="p-8"><p>词库还是空的，请先导入词汇。</p><Link href="/" className="text-indigo-600">返回主页</Link></main>;

  if (!started) return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-indigo-600">← 返回主页</Link>
        <h1 className="mt-6 text-3xl font-bold">{mode === "memory" ? "单词背诵" : "单词测试"}</h1>
        <p className="mt-2 text-slate-500">选择要学习的词汇</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => selectDay("today")} className={`rounded-2xl border p-5 text-left font-semibold ${selectedDay === "today" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white"}`}>今日单词<span className="mt-1 block text-sm font-normal">{userId ? `最近导入的第${todayDay}天` : "示例词汇"}</span></button>
          {dayNumbers.map((day) => <button key={day} type="button" onClick={() => selectDay(day)} className={`rounded-2xl border p-5 text-left font-semibold ${selectedDay === day ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white"}`}>第{day}天单词</button>)}
        </div>
        <button type="button" onClick={beginStudy} disabled={!entries.length} className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white disabled:bg-slate-300">开始{mode === "memory" ? "背诵" : "测试"}（{entries.length}词）</button>
        {!entries.length && <p className="mt-3 text-sm text-slate-500">这一天暂无单词，请选择其他天。</p>}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <button type="button" onClick={() => setShowLeaveDialog(true)} className="home-return-button mb-4">← 返回主页</button>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">VOCA！· {selectedDay === "today" ? "今日单词" : `第${selectedDay}天`}</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{mode === "memory" ? "单词背诵" : "单词测试"}</h1>
            <button type="button" onClick={() => setStarted(false)} className="mt-3 text-sm font-semibold text-indigo-600">切换学习天数</button>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs text-slate-400">当前词条</p>
            <p className="text-2xl font-bold text-indigo-600">{index + 1} / {entries.length}</p>
          </div>
        </header>
        {mode === "memory" ? (
          <section className="relative rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">词条 {index + 1}</span>
              <button type="button" onClick={() => { setShowStarredOnly((value) => !value); setIndex(0); }} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 sm:absolute sm:-left-36 sm:top-8">★ {showStarredOnly ? "全部单词" : "星标单词"}（{starredIds.length}）</button>
              <button type="button" onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(current.phrase))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">🔊 播放发音</button>
            </div>
            {showStarredOnly && !memoryEntries.length ? <p className="rounded-2xl bg-amber-50 p-6 text-amber-900">还没有星标单词，请先点击当前词条旁的星标按钮。</p> : <>
            <p className="text-5xl font-bold tracking-tight sm:text-7xl">{current.phrase}</p>
            <button type="button" onClick={() => toggleStar(current)} className="mt-4 rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700">{starredIds.includes(current.id) ? "★ 已星标" : "☆ 标记星标"}</button>
            <p className="mt-4 font-mono text-lg text-indigo-600">{current.phonetic}</p>
            <p className="mt-8 text-2xl font-semibold text-slate-700">{current.meanings.join("；")}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">同义词</p><p className="mt-2 text-slate-700">{current.synonyms.length ? current.synonyms.join(" · ") : "暂无同义词"}</p></div>
              <div className="rounded-2xl bg-amber-50 p-5"><p className="text-xs font-semibold uppercase tracking-wider text-amber-600">记忆方法</p><p className="mt-2 text-amber-900">{current.memoryTip || "结合词义和例句联想记忆。"}</p></div>
            </div>
            <button type="button" onClick={() => setShowDetails((value) => !value)} className="mt-6 text-sm font-semibold text-indigo-600">{showDetails ? "收起例句" : "查看例句和用法"}</button>
            {showDetails && <p className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-950">{current.example}</p>}
            <div className="mt-8 flex gap-3"><button type="button" onClick={previous} className="flex-1 rounded-xl border border-slate-200 px-5 py-3 font-semibold">上一个</button><button type="button" onClick={next} className="flex-1 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white">下一个</button></div>
            </>}
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="mb-8 flex items-center justify-between"><span className="text-sm font-semibold text-slate-400">第 {index + 1} 题</span><span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">中文提示</span></div>
            <p className="text-3xl font-bold tracking-tight sm:text-5xl">{current.meanings.join("；")}</p>
            <p className="mt-3 text-sm text-slate-400">输入英文单词或短语，按 Shift + Enter 提交</p>
            <form onSubmit={(event) => { void submit(event); }} className="mt-8">
              <input ref={answerInputRef} autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={handleKeyDown} disabled={Boolean(result)} placeholder="输入英文答案" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xl outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 disabled:opacity-70" />
              <button type="submit" disabled={!answer.trim() || Boolean(result)} className="mt-4 w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200">确认答案</button>
            </form>
            {result && <div className={`mt-6 rounded-2xl p-5 ${result.correct ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}><p className="text-lg font-bold">{result.correct ? "回答正确" : "再记一次"}</p><p className="mt-2 text-sm">你的答案：{result.answer}</p><p className="text-sm">正确答案：{current.phrase}</p><p className="mt-2 text-xs">{result.correct && retryRounds[current.id] !== undefined ? `错题连续答对 ${retryRounds[current.id] + 1} / 3 次` : result.correct ? "本题已完成" : "本题会随机插入后续测试"}</p><button type="button" onClick={next} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold shadow-sm">下一题（或按 Enter）</button></div>}
            {saveError && <p role="status" className="mt-3 text-sm text-rose-600">记录保存失败：{saveError}</p>}
          </section>
        )}
        {showLeaveDialog && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-5"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><h2 className="text-xl font-bold text-slate-900">确认离开{mode === "memory" ? "背诵" : "测试"}？</h2><p className="mt-3 leading-7 text-slate-600">确认返回主页吗？</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setShowLeaveDialog(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600">继续学习</button><button type="button" onClick={() => router.push("/")} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">确认离开</button></div></div></div>}
      </div>
    </main>
  );
}
