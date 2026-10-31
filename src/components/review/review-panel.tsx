"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { StudyRecord } from "@/lib/domain";
import { calculateStreak, getReviewQueue, summarizeReviews } from "@/lib/review";
import { createClient } from "@/lib/supabase/client";
import { getStudyDate } from "@/lib/study-date";

const supabase = createClient();

const today = getStudyDate();
export function ReviewPanel() {
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [completedDates, setCompletedDates] = useState<string[]>([]);
  const [vocabulary, setVocabulary] = useState<Record<string, string>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const summary = useMemo(() => summarizeReviews(records, Object.keys(vocabulary), today), [records, vocabulary]);
  const queue = useMemo(() => getReviewQueue(records), [records]);
  const streak = calculateStreak(completedDates, today);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      setUserId(user.id);
      const [words, answers, days] = await Promise.all([
        supabase.from("vocabulary_entries").select("id, term").eq("user_id", user.id),
        supabase.from("study_records").select("id, vocabulary_id, answer, correct, consecutive_correct, status, answered_at").eq("user_id", user.id).order("answered_at", { ascending: true }),
        supabase.from("study_days").select("study_date, created_at").eq("user_id", user.id),
      ]);
      if (!active) return;
      setVocabulary(Object.fromEntries((words.data ?? []).map((word) => [word.id, word.term])));
      setRecords((answers.data ?? []).map((record) => ({
        id: record.id, vocabularyId: record.vocabulary_id, answer: record.answer, acceptedAnswer: "",
        correct: record.correct, consecutiveCorrect: record.consecutive_correct, status: record.status,
        answeredAt: record.answered_at,
      })));
      setCompletedDates((days.data ?? []).map((day) => getStudyDate(new Date(day.created_at)) === today ? today : day.study_date));
    }
    void load();
    return () => { active = false; };
  }, []);

  async function completeToday() {
    if (!userId) return;
    const { error } = await supabase.from("study_days").insert({ user_id: userId, study_date: today });
    if (error) { setMessage(error.message); return; }
    setCompletedDates((current) => [...current, today]);
  }

  return (
    <section className="review-shell">
      <header className="review-header">
        <div>
          <Link href="/" className="home-return-button">← 返回主页</Link>
          <p className="review-eyebrow">REVIEW CENTER</p>
          <h1>错题回顾与打卡</h1>
          <p>测试开始前优先复习错题，连续三次答对后自动标记为已掌握。</p>
        </div>
        <div className="review-streak"><strong>{streak}</strong><span>天连续打卡</span></div>
      </header>
      <div className="review-stats">
        <div><span>待复习</span><strong>{summary.due}</strong></div>
        <div><span>已掌握</span><strong>{summary.mastered}</strong></div>
        <div><span>今日正确率</span><strong>{summary.accuracy}%</strong></div>
        <div><span>今日状态</span><strong>{completedDates.includes(today) ? "已完成" : "待完成"}</strong></div>
      </div>
      <div className="review-card">
        <div className="review-card-heading"><div><h2>错题队列</h2><p>共 {queue.length} 个词条等待巩固</p></div><button type="button" onClick={() => { void completeToday(); }} disabled={!userId || completedDates.includes(today)}>完成今日打卡</button></div>
        {queue.length ? <ul className="review-list">{queue.map((record) => <li key={record.id}><div><strong>{vocabulary[record.vocabularyId] ?? record.vocabularyId}</strong><span>{record.correct ? "正在巩固" : "需要复习"}</span></div><em>连续正确 {record.consecutiveCorrect} 次</em></li>)}</ul> : <div className="review-empty">{userId ? "目前没有待复习错题，完成今日测试后会自动记录。" : <Link href="/auth">登录后查看云端记录</Link>}</div>}
        {message && <p role="status" className="text-rose-600">{message}</p>}
      </div>
    </section>
  );
}

