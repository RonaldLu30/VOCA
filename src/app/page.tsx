"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { VocaPet } from "@/components/voca-pet";
import { parseVocabularyCsv, parseVocabularyText, VocabularyEntry } from "@/lib/vocabulary-parser";
import { extractPdfText } from "@/lib/pdf-vocabulary";
import { detectDayNumber, nextDayNumber } from "@/lib/study-day";
import { createClient } from "@/lib/supabase/client";
import { calculateStreak } from "@/lib/review";

const supabase = createClient();
const sample = "abandon\t放弃；遗弃\naccurate\t准确的\ntake advantage of\t利用";
const pendingImportKey = "voca.pendingImport";
const today = new Date().toISOString().slice(0, 10);
type StoredEntry = VocabularyEntry & { list_id: string };
type StoredList = { id: string; day_number: number; created_at: string };
type ImportPreview = { value: string; name: string; entries: VocabularyEntry[] };

async function saveWords(userId: string, parsed: VocabularyEntry[], content: string, fileName: string) {
  const { data: existingLists, error: fetchError } = await supabase.from("vocabulary_lists")
    .select("day_number").eq("user_id", userId);
  if (fetchError) return { data: [] as StoredEntry[], list: null as StoredList | null, error: fetchError.message };
  const dayNumber = detectDayNumber(content, fileName)
    ?? nextDayNumber((existingLists ?? []).map((list) => list.day_number));
  const { data: list, error: listError } = await supabase.from("vocabulary_lists")
    .insert({ user_id: userId, day_number: dayNumber, title: `第${dayNumber}天` })
    .select("id, day_number, created_at").single();
  if (listError || !list) return { data: [] as StoredEntry[], list: null as StoredList | null, error: listError?.message ?? "创建词表失败" };
  const { data, error } = await supabase.from("vocabulary_entries")
    .insert(parsed.map((item) => ({ list_id: list.id, user_id: userId, term: item.term, meaning: item.meaning, synonyms: item.synonyms })))
    .select("id, term, meaning, synonyms, list_id");
  if (error) {
    await supabase.from("vocabulary_lists").delete().eq("id", list.id);
    return { data: [] as StoredEntry[], list: null, error: error.message };
  }
  return { data: data ?? [], list, error: null };
}

function parseWords(value: string, name: string) {
  return name.toLowerCase().endsWith(".csv") ? parseVocabularyCsv(value) : parseVocabularyText(value);
}

export default function Home() {
  const [entries, setEntries] = useState<StoredEntry[]>([]);
  const [lists, setLists] = useState<StoredList[]>([]);
  const [source, setSource] = useState(sample);
  const [previews, setPreviews] = useState<ImportPreview[]>([]);
  const [savingPreview, setSavingPreview] = useState(false);
  const [view, setView] = useState<"home" | "library">("home");
  const [deleteTarget, setDeleteTarget] = useState<StoredEntry | null>(null);
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [status, setStatus] = useState("可拖拽 TXT、CSV、文字型 PDF、Word，或直接粘贴内容");
  const [dragging, setDragging] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const level = Math.floor(energy / 100);
  const levelProgress = energy % 100;
  const streak = calculateStreak(completedDates, today);
  const completedToday = completedDates.includes(today);
  const orderedDays = [...new Set(lists.map((list) => list.day_number))].sort((left, right) => left - right);

  useEffect(() => {
    window.localStorage.removeItem("wordkiller.auth.account");
    window.localStorage.removeItem("wordkiller.auth.session");
    let active = true;
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!active) return;
      if (!authUser) { setUser(null); setEntries([]); setLists([]); return; }
      const [profile, words, savedLists, days] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", authUser.id).single(),
        supabase.from("vocabulary_entries").select("id, term, meaning, synonyms, list_id").eq("user_id", authUser.id).order("created_at", { ascending: false }),
        supabase.from("vocabulary_lists").select("id, day_number, created_at").eq("user_id", authUser.id).order("created_at", { ascending: false }),
        supabase.from("study_days").select("study_date, energy_awarded").eq("user_id", authUser.id),
      ]);
      if (!active) return;
      setUser({ id: authUser.id, username: profile.data?.username ?? authUser.email ?? "用户" });
      setEntries(words.data ?? []);
      setLists(savedLists.data ?? []);
      setEnergy((days.data ?? []).reduce((sum, day) => sum + day.energy_awarded, 0));
      setCompletedDates((days.data ?? []).map((day) => day.study_date));
      const pending = window.sessionStorage.getItem(pendingImportKey);
      if (pending) {
        window.sessionStorage.removeItem(pendingImportKey);
        const parsedPending = JSON.parse(pending) as { value: string; name: string } | { value: string; name: string }[];
        for (const { value, name } of Array.isArray(parsedPending) ? parsedPending : [parsedPending]) {
          setSource(value);
          const { data, list, error } = await saveWords(authUser.id, parseWords(value, name), value, name);
          if (!active) return;
          if (error) setStatus(`保存失败：${error}`);
          else {
            setEntries((current) => [...data, ...current]);
            if (list) setLists((current) => [list, ...current]);
            setStatus(`已保存到第${list?.day_number}天：${data.length} 个单词`);
          }
        }
      }
    }
    void loadData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { void loadData(); }, 0); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  function previewWords(value: string, name = "") {
    setSource(value);
    const parsed = parseWords(value, name);
    if (!parsed.length) { setStatus("没有识别到词汇；请检查文件中的英文、中文释义和表头。"); return; }
    setPreviews((current) => [...current, { value, name, entries: parsed }]);
    setStatus(`已识别 ${parsed.length} 个词汇，其中 ${parsed.filter((entry) => entry.synonyms.length).length} 个含同义词；请检查预览后确认保存。`);
  }

  async function importWords(value: string, name = "") {
    setSource(value);
    const parsed = parseWords(value, name);
    if (!parsed.length) { setStatus("没有识别到词汇；请检查文件中的英文、中文释义和表头。"); return false; }
    if (!user) {
      try {
        const pending = window.sessionStorage.getItem(pendingImportKey);
        const previous = pending ? JSON.parse(pending) as { value: string; name: string } | { value: string; name: string }[] : [];
        const pendingFiles = Array.isArray(previous) ? previous : [previous];
        window.sessionStorage.setItem(pendingImportKey, JSON.stringify([...pendingFiles, { value, name }]));
        setStatus(`已读取 ${parsed.length} 个单词；请登录，登录后会自动保存。`);
      } catch {
        setStatus(`已读取 ${parsed.length} 个单词；请登录后重新导入。`);
        return false;
      }
      return true;
    }
    setStatus(`正在保存 ${parsed.length} 个单词…`);
    const { data, list, error } = await saveWords(user.id, parsed, value, name);
    if (error) { setStatus(`保存失败：${error}`); return false; }
    setEntries((current) => [...data, ...current]);
    if (list) setLists((current) => [list, ...current]);
    setStatus(`已保存到第${list?.day_number}天：${data.length} 个单词`);
    return true;
  }

  async function confirmPreview() {
    if (savingPreview || !previews.length) return;
    setSavingPreview(true);
    try {
      if (await importWords(previews[0].value, previews[0].name)) setPreviews((current) => current.slice(1));
    } finally {
      setSavingPreview(false);
    }
  }

  async function importFile(file: File) {
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "txt" && extension !== "csv" && extension !== "pdf" && extension !== "docx" && extension !== "doc") {
      setStatus("当前支持 TXT、CSV、文字型 PDF、DOCX 和 DOC 文件。");
      return;
    }
    setStatus(`正在读取 ${file.name}…`);
    try {
      let value: string;
      if (extension === "pdf") value = await extractPdfText(file);
      else if (extension === "docx" || extension === "doc") {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/vocabulary/extract-word", { method: "POST", body: form });
        const result = await response.json() as { text?: string; error?: string };
        if (!response.ok || !result.text) throw new Error(result.error ?? "Word 文件解析失败");
        value = result.text;
      } else value = await file.text();
      previewWords(value, file.name);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "读取文件失败，请重试。");
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length) void (async () => { for (const file of files) await importFile(file); })();
    event.target.value = "";
  }

  useEffect(() => {
    function handleDragOver(event: globalThis.DragEvent) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setDragging(true);
    }

    function handleDrop(event: globalThis.DragEvent) {
      event.preventDefault();
      setDragging(false);
      const transfer = event.dataTransfer;
      const files = transfer?.files.length ? Array.from(transfer.files) : Array.from(transfer?.items ?? [])
        .filter((item) => item.kind === "file").map((item) => item.getAsFile()).filter((file): file is File => Boolean(file));
      if (files?.length) void (async () => { for (const file of files) await importFile(file); })();
      else setStatus("未收到文件。若从微信拖入，请先在微信中保存 PDF，再从文件管理器拖入或点击“选择文件”。");
    }

    function handleDragEnd() {
      setDragging(false);
    }

    function handleDragLeave(event: globalThis.DragEvent) {
      if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
        setDragging(false);
      }
    }

    window.addEventListener("dragover", handleDragOver, true);
    window.addEventListener("drop", handleDrop, true);
    window.addEventListener("dragend", handleDragEnd, true);
    window.addEventListener("dragleave", handleDragLeave, true);
    return () => {
      window.removeEventListener("dragover", handleDragOver, true);
      window.removeEventListener("drop", handleDrop, true);
      window.removeEventListener("dragend", handleDragEnd, true);
      window.removeEventListener("dragleave", handleDragLeave, true);
    };
  });

  async function updateEntry(id: string, field: "term" | "meaning", value: string) {
    setEntries((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
    const { error } = await supabase.from("vocabulary_entries").update({ [field]: value }).eq("id", id);
    if (error) setStatus(`保存失败：${error.message}`);
  }

  async function deleteEntry() {
    if (!deleteTarget) return;
    const { error } = await supabase.from("vocabulary_entries").delete().eq("id", deleteTarget.id);
    if (error) setStatus(`删除失败：${error.message}`);
    else setEntries((current) => current.filter((item) => item.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setEntries([]);
    setLists([]);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <nav className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-4xl font-black tracking-[0.12em] text-indigo-600">VOCA！</Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <button onClick={() => setView("home")} className="rounded-lg px-3 py-2 text-slate-600">主页</button>
            <Link href="/review" className="rounded-lg px-3 py-2 text-slate-600">错题库</Link>
            {user ? (
              <details className="relative ml-2">
                <summary className="cursor-pointer rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">已登录：{user.username}</summary>
                <div className="absolute right-0 top-11 z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <button type="button" onClick={signOut} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">退出登录</button>
                </div>
              </details>
            ) : <Link href="/auth" className="ml-2 rounded-lg bg-slate-900 px-3 py-2 text-white">登录 / 注册</Link>}
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-10">
        <header className="mb-7"><p className="text-lg font-semibold tracking-[0.08em] text-slate-500">voca！记住了！</p></header>
        {view === "home" && (
          <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className={`rounded-3xl border bg-white p-6 shadow-sm ${dragging ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div><h2 className="text-xl font-bold">导入单词文件</h2><p className="mt-1 text-sm text-slate-500" role="status">{dragging ? "松开即可导入文件" : status}</p></div>
                <label className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">选择文件<input className="hidden" type="file" multiple accept=".txt,.csv,.pdf,.docx,.doc,application/pdf" onChange={handleFile} /></label>
              </div>
              <p className="mt-3 text-sm text-slate-500">从微信直接拖放若无反应，请先把 PDF 保存到电脑，再拖入或选择文件。</p>
              {!user && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">保存到云端需要先 <Link href="/auth" className="font-bold underline">登录账号</Link>；拖入的词汇会保留到登录后自动保存。</p>}
              <textarea value={source} onChange={(event) => setSource(event.target.value)} className="mt-5 min-h-48 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm" aria-label="词汇内容，可拖入 TXT、CSV、PDF 或 Word 文件" />
              <button onClick={() => previewWords(source)} className="mt-4 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700">识别粘贴内容</button>
              {previews.length > 0 && <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <h3 className="font-bold text-indigo-900">导入预览：{previews[0].name || "粘贴内容"}（{previews[0].entries.length} 词）</h3>
                {previews.length > 1 && <p className="mt-1 text-sm text-indigo-700">另有 {previews.length - 1} 个文件等待预览</p>}
                <div className="mt-3 max-h-64 overflow-auto rounded-xl bg-white"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">英文</th><th className="p-2">中文释义</th><th className="p-2">同义词</th></tr></thead><tbody>{previews[0].entries.slice(0, 20).map((entry) => <tr key={entry.id} className="border-t border-slate-100"><td className="p-2">{entry.term}</td><td className="p-2">{entry.meaning}</td><td className="p-2">{entry.synonyms.join("、") || "—"}</td></tr>)}</tbody></table></div>
                {previews[0].entries.length > 20 && <p className="mt-2 text-xs text-slate-500">仅预览前 20 词，确认后保存全部词汇。</p>}
                <div className="mt-4 flex gap-2"><button onClick={() => { void confirmPreview(); }} disabled={savingPreview} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingPreview ? "正在保存…" : "确认保存"}</button><button onClick={() => setPreviews((current) => current.slice(1))} disabled={savingPreview} className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">取消</button></div>
              </div>}
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={() => setView("library")} className="flex-1 rounded-3xl bg-white p-7 text-left shadow-sm ring-1 ring-slate-200"><span className="text-sm font-semibold text-indigo-600">全部词汇</span><strong className="mt-3 block text-2xl">我的单词库 →</strong><span className="mt-2 block text-sm text-slate-400">查看并编辑所有单词</span></button>
              <Link href="/learn?mode=memory" className="flex-1 rounded-3xl bg-slate-900 p-7 text-left text-white"><span className="text-sm font-semibold text-indigo-300">单词背诵</span><strong className="mt-3 block text-2xl">开始背诵 →</strong><span className="mt-2 block text-sm text-indigo-300">选择今日或指定天数</span></Link>
              <Link href="/learn?mode=test" className="flex-1 rounded-3xl bg-white p-7 text-left shadow-sm ring-1 ring-slate-200"><span className="text-sm font-semibold text-indigo-600">单词测试</span><strong className="mt-3 block text-2xl">开始测试 →</strong><span className="mt-2 block text-sm text-slate-400">选择今日或指定天数</span></Link>
            </div>
          </section>
        )}
        {view === "library" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">我的单词库</h2><button onClick={() => setView("home")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">返回主页</button></div>
            {orderedDays.map((day) => {
              const listIds = new Set(lists.filter((list) => list.day_number === day).map((list) => list.id));
              const dayEntries = entries.filter((entry) => listIds.has(entry.list_id));
              return <div key={day} className="mb-7"><h3 className="mb-3 rounded-xl bg-indigo-50 px-4 py-3 text-lg font-bold text-indigo-700">第{day}天 <span className="text-sm font-normal">· {dayEntries.length} 个单词</span></h3><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b text-xs text-slate-400"><tr><th className="p-3">#</th><th className="p-3">英文 / 短语</th><th className="p-3">中文释义</th><th className="p-3">操作</th></tr></thead><tbody>
                {dayEntries.map((entry, index) => <tr key={entry.id} className="border-b border-slate-50"><td className="p-3 text-slate-400">{index + 1}</td><td className="p-3"><input value={entry.term} onChange={(event) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, term: event.target.value } : item))} onBlur={(event) => { void updateEntry(entry.id, "term", event.target.value); }} className="w-full rounded-lg px-2 py-2 font-semibold" /></td><td className="p-3"><input value={entry.meaning} onChange={(event) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, meaning: event.target.value } : item))} onBlur={(event) => { void updateEntry(entry.id, "meaning", event.target.value); }} className="w-full rounded-lg px-2 py-2 text-slate-600" /></td><td className="p-3"><button type="button" onClick={() => setDeleteTarget(entry)} className="font-semibold text-rose-600">删除</button></td></tr>)}
              </tbody></table></div></div>;
            })}
            {!entries.length && <p className="p-4 text-slate-400">还没有词汇。登录后从主页导入。</p>}
            {status.startsWith("保存失败") || status.startsWith("删除失败") ? <p role="status" className="text-rose-600">{status}</p> : null}
          </section>
        )}
        {deleteTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-5"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><h2 className="text-xl font-bold">确认删除单词？</h2><p className="mt-3 text-slate-600">确定要删除“<strong>{deleteTarget.term}</strong>”吗？</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600">取消</button><button type="button" onClick={() => { void deleteEntry(); }} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white">确认删除</button></div></div></div>}
      </div>
      {dragging && <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-indigo-950/55 p-6"><div className="rounded-3xl border-2 border-dashed border-white bg-indigo-600 px-10 py-8 text-center text-xl font-bold text-white shadow-2xl">松开文件即可导入词汇</div></div>}
      <section className="energy-card mx-auto mb-6 mt-2 flex w-[min(92vw,560px)] items-center gap-4 rounded-2xl border border-indigo-200 bg-white px-5 py-3 shadow-sm" aria-label="宠物能量">
        <VocaPet awake={completedToday} celebrating={completedToday} />
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-3 text-sm font-semibold"><span>VOCA！ · Lv.{level}</span><span>{levelProgress} / 100 能量</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-50"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" style={{ width: `${levelProgress}%` }} /></div>
          <p className="mt-1 text-xs text-slate-400">{completedToday ? `已连续${streak}日打卡，继续加油！` : "完成今日打卡可获得 20 能量"}</p>
        </div>
      </section>
    </main>
  );
}
