"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { parseVocabularyCsv, parseVocabularyText, VocabularyEntry } from "@/lib/vocabulary-parser";

const example = "abandon\t放弃；遗弃\naccurate - 准确的\ntake advantage of, 利用\n# 支持用注释标记忽略一行";

export default function Home() {
  const [source, setSource] = useState(example);
  const [entries, setEntries] = useState<VocabularyEntry[]>(() => parseVocabularyText(example));
  const [message, setMessage] = useState("已解析 3 个词条");
  const parsedPreview = useMemo(() => parseVocabularyText(source), [source]);

  function refreshPreview() {
    const nextEntries = parseVocabularyText(source);
    setEntries(nextEntries);
    setMessage(nextEntries.length ? "已解析 " + nextEntries.length + " 个词条" : "暂未识别到有效词条");
  }

  function updateEntry(id: string, field: "term" | "meaning", value: string) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)));
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const isText = file.name.endsWith(".txt") || file.name.endsWith(".csv");
    if (!isText) {
      setMessage("当前支持 TXT 和 CSV；Excel、Word 将在后续版本接入");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      setSource(value);
      const nextEntries = file.name.endsWith(".csv") ? parseVocabularyCsv(value) : parseVocabularyText(value);
      setEntries(nextEntries);
      setMessage("已从 " + file.name + " 解析 " + nextEntries.length + " 个词条");
    };
    reader.readAsText(file);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">WordKiller</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">导入今日词汇</h1>
            <p className="mt-3 max-w-2xl text-slate-500">粘贴或上传词汇表，确认后进入记忆模式。每行一个词条，英文和中文之间使用空格、Tab、逗号或短横线分隔。</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs text-slate-400">今日词汇</p>
            <p className="text-2xl font-bold text-indigo-600">{entries.length}</p>
          </div>
        </header>
        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">粘贴词汇</h2>
                <p className="mt-1 text-sm text-slate-400">支持英文单词、短语和完整中文释义</p>
              </div>
              <label className="cursor-pointer rounded-xl border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50">
                上传文件
                <input className="hidden" type="file" accept=".txt,.csv,.xlsx,.docx" onChange={handleFile} />
              </label>
            </div>
            <textarea value={source} onChange={(event) => setSource(event.target.value)} className="min-h-80 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-7 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" aria-label="词汇内容" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{message}</p>
              <button type="button" onClick={refreshPreview} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">重新解析</button>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">确认词条</h2>
                <p className="mt-1 text-sm text-slate-400">可在保存前修改识别结果</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">待确认</span>
            </div>
            <div className="space-y-3">
              {entries.length ? entries.map((entry, index) => (
                <div key={entry.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[auto_1fr_1.35fr] sm:items-center">
                  <span className="text-xs font-semibold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                  <input value={entry.term} onChange={(event) => updateEntry(entry.id, "term", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium outline-none focus:border-indigo-400" aria-label={"第 " + (index + 1) + " 个英文"} />
                  <input value={entry.meaning} onChange={(event) => updateEntry(entry.id, "meaning", event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-600 outline-none focus:border-indigo-400" aria-label={"第 " + (index + 1) + " 个中文释义"} />
                </div>
              )) : <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">解析后将在这里显示词条</div>}
            </div>
            <button type="button" disabled={!entries.length} className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200">确认并进入记忆模式</button>
            <p className="mt-3 text-center text-xs text-slate-400">保存后系统将自动补充音标、例句和记忆方法</p>
          </div>
        </section>
        <p className="mt-6 text-center text-xs text-slate-400">预览 {parsedPreview.length} 条 · 后续支持 Excel、Word 和词典接口</p>
      </div>
    </main>
  );
}
