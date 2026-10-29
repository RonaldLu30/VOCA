"use client";

import { ChangeEvent, DragEvent, useEffect, useState } from "react";
import Link from "next/link";
import { VocaPet } from "@/components/voca-pet";
import { parseVocabularyCsv, parseVocabularyText, VocabularyEntry } from "@/lib/vocabulary-parser";
import { extractPdfText } from "@/lib/pdf-vocabulary";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const sample = "abandon\t放弃；遗弃\naccurate\t准确的\ntake advantage of\t利用";
const pendingImportKey = "voca.pendingImport";

async function saveWords(userId: string, parsed: VocabularyEntry[]) {
  const { data: list, error: listError } = await supabase.from("vocabulary_lists").insert({ user_id: userId }).select("id").single();
  if (listError || !list) return { data: [] as VocabularyEntry[], error: listError?.message ?? "创建词表失败" };
  const { data, error } = await supabase.from("vocabulary_entries")
    .insert(parsed.map((item) => ({ list_id: list.id, user_id: userId, term: item.term, meaning: item.meaning })))
    .select("id, term, meaning");
  return { data: data ?? [], error: error?.message ?? null };
}

function parseWords(value: string, name: string) {
  return name.toLowerCase().endsWith(".csv") ? parseVocabularyCsv(value) : parseVocabularyText(value);
}

export default function Home() {
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [source, setSource] = useState(sample);
  const [view, setView] = useState<"home" | "library" | "today">("home");
  const [deleteTarget, setDeleteTarget] = useState<VocabularyEntry | null>(null);
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [status, setStatus] = useState("可拖拽 TXT、CSV、文字型 PDF，或直接粘贴内容");
  const [dragging, setDragging] = useState(false);
  const [energy, setEnergy] = useState(0);
  const level = Math.floor(energy / 100);
  const levelProgress = energy % 100;

  useEffect(() => {
    window.localStorage.removeItem("wordkiller.auth.account");
    window.localStorage.removeItem("wordkiller.auth.session");
    let active = true;
    async function loadData() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!active) return;
      if (!authUser) { setUser(null); setEntries([]); return; }
      const [profile, words, days] = await Promise.all([
        supabase.from("profiles").select("username").eq("id", authUser.id).single(),
        supabase.from("vocabulary_entries").select("id, term, meaning").eq("user_id", authUser.id).order("created_at", { ascending: false }),
        supabase.from("study_days").select("energy_awarded").eq("user_id", authUser.id),
      ]);
      if (!active) return;
      setUser({ id: authUser.id, username: profile.data?.username ?? authUser.email ?? "用户" });
      setEntries(words.data ?? []);
      setEnergy((days.data ?? []).reduce((sum, day) => sum + day.energy_awarded, 0));
      const pending = window.sessionStorage.getItem(pendingImportKey);
      if (pending) {
        window.sessionStorage.removeItem(pendingImportKey);
        const { value, name } = JSON.parse(pending) as { value: string; name: string };
        setSource(value);
        const { data, error } = await saveWords(authUser.id, parseWords(value, name));
        if (!active) return;
        if (error) setStatus(`保存失败：${error}`);
        else {
          setEntries((current) => [...data, ...current]);
          setStatus(`已保存 ${data.length} 个单词到云端`);
        }
      }
    }
    void loadData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { setTimeout(() => { void loadData(); }, 0); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function importWords(value: string, name = "") {
    setSource(value);
    const parsed = parseWords(value, name);
    if (!parsed.length) { setStatus("没有识别到词汇；每行请填写“英文 空格 中文”。"); return; }
    if (!user) {
      try {
        window.sessionStorage.setItem(pendingImportKey, JSON.stringify({ value, name }));
        setStatus(`已读取 ${parsed.length} 个单词；请登录，登录后会自动保存。`);
      } catch {
        setStatus(`已读取 ${parsed.length} 个单词；请登录后重新导入。`);
      }
      return;
    }
    setStatus(`正在保存 ${parsed.length} 个单词…`);
    const { data, error } = await saveWords(user.id, parsed);
    if (error) { setStatus(`保存失败：${error}`); return; }
    setEntries((current) => [...data, ...current]);
    setStatus(`已保存 ${data.length} 个单词到云端`);
  }

  async function importFile(file: File) {
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension !== "txt" && extension !== "csv" && extension !== "pdf") {
      setStatus("当前仅支持 TXT、CSV 和文字型 PDF 文件。");
      return;
    }
    setStatus(`正在读取 ${file.name}…`);
    try {
      const value = extension === "pdf" ? await extractPdfText(file) : await file.text();
      await importWords(value, file.name);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "读取文件失败，请重试。");
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void importFile(file);
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    setDragging(false);
    void importFile(event.dataTransfer.files[0]);
  }

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
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <nav className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-4xl font-black tracking-[0.12em] text-indigo-600">VOCA！</Link>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <button onClick={() => setView("home")} className="rounded-lg px-3 py-2 text-slate-600">主页</button>
            <Link href="/learn" className="rounded-lg px-3 py-2 text-slate-600">单词测试</Link>
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
            <div className={`rounded-3xl border bg-white p-6 shadow-sm ${dragging ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200" : "border-slate-200"}`} onDragOver={handleDragOver} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={handleDrop}>
              <div className="flex items-center justify-between">
                <div><h2 className="text-xl font-bold">上传今日词汇</h2><p className="mt-1 text-sm text-slate-500" role="status">{dragging ? "松开即可导入文件" : status}</p></div>
                <label className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">选择文件<input className="hidden" type="file" accept=".txt,.csv,.pdf,application/pdf" onChange={handleFile} /></label>
              </div>
              {!user && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">保存到云端需要先 <Link href="/auth" className="font-bold underline">登录账号</Link>；拖入的词汇会保留到登录后自动保存。</p>}
              <textarea value={source} onChange={(event) => setSource(event.target.value)} className="mt-5 min-h-48 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm" aria-label="词汇内容，可拖入 TXT、CSV 或 PDF 文件" />
              <button onClick={() => { void importWords(source); }} className="mt-4 rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700">解析并保存词汇</button>
            </div>
            <div className="flex flex-col gap-4">
              <button onClick={() => setView("library")} className="flex-1 rounded-3xl bg-white p-7 text-left shadow-sm ring-1 ring-slate-200"><span className="text-sm font-semibold text-indigo-600">全部词汇</span><strong className="mt-3 block text-2xl">我的单词库 →</strong><span className="mt-2 block text-sm text-slate-400">查看并编辑所有单词</span></button>
              <Link href="/learn" className="flex-1 rounded-3xl bg-slate-900 p-7 text-left text-white"><span className="text-sm font-semibold text-indigo-300">今日新导入</span><strong className="mt-3 block text-2xl">开始背诵 →</strong><span className="mt-2 block text-sm text-indigo-300">进入今日单词表</span></Link>
            </div>
          </section>
        )}
        {(view === "library" || view === "today") && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">我的单词库</h2><button onClick={() => setView("home")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">返回主页</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b text-xs text-slate-400"><tr><th className="p-3">#</th><th className="p-3">英文 / 短语</th><th className="p-3">中文释义</th><th className="p-3">操作</th></tr></thead><tbody>
              {entries.map((entry, index) => <tr key={entry.id} className="border-b border-slate-50"><td className="p-3 text-slate-400">{index + 1}</td><td className="p-3"><input value={entry.term} onChange={(event) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, term: event.target.value } : item))} onBlur={(event) => { void updateEntry(entry.id, "term", event.target.value); }} className="w-full rounded-lg px-2 py-2 font-semibold" /></td><td className="p-3"><input value={entry.meaning} onChange={(event) => setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, meaning: event.target.value } : item))} onBlur={(event) => { void updateEntry(entry.id, "meaning", event.target.value); }} className="w-full rounded-lg px-2 py-2 text-slate-600" /></td><td className="p-3"><button type="button" onClick={() => setDeleteTarget(entry)} className="font-semibold text-rose-600">删除</button></td></tr>)}
            </tbody></table></div>
            {!entries.length && <p className="p-4 text-slate-400">还没有词汇。登录后从主页导入。</p>}
            {status.startsWith("保存失败") || status.startsWith("删除失败") ? <p role="status" className="text-rose-600">{status}</p> : null}
          </section>
        )}
        {deleteTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-5"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><h2 className="text-xl font-bold">确认删除单词？</h2><p className="mt-3 text-slate-600">确定要删除“<strong>{deleteTarget.term}</strong>”吗？</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600">取消</button><button type="button" onClick={() => { void deleteEntry(); }} className="flex-1 rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white">确认删除</button></div></div></div>}
      </div>
      <div className="fixed bottom-4 left-1/2 z-10 w-[min(92vw,720px)] -translate-x-1/2 rounded-3xl border border-indigo-200 bg-white/90 px-5 py-3 shadow-[0_8px_28px_rgba(79,70,229,0.18)]">
        <div className="mx-auto max-w-7xl"><div className="flex justify-between text-sm font-semibold"><span className="flex items-center gap-2"><VocaPet awake={false} /><span>VOCA！ · Lv.{level}</span></span><span>{levelProgress} / 100 能量</span></div><div className="mt-2 h-4 overflow-hidden rounded-full border border-indigo-100 bg-indigo-50"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all" style={{ width: `${levelProgress}%` }} /></div><p className="mt-1 text-xs text-slate-400">完成今日打卡可获得 20 能量，每 100 能量升一级</p></div>
      </div>
    </main>
  );
}
