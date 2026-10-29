"use client";

import { useMemo, useState } from "react";
import type { StudyRecord } from "@/lib/domain";
import { calculateStreak, getReviewQueue, summarizeReviews } from "@/lib/review";
import { loadCompletedDates, loadStudyRecords, markDateCompleted } from "@/lib/study-storage";

const today = new Date().toISOString().slice(0, 10);
const demoVocabulary = [
  { id: "abandon", phrase: "abandon", meaning: "放弃；遗弃" },
  { id: "accurate", phrase: "accurate", meaning: "准确的" },
  { id: "take-advantage", phrase: "take advantage of", meaning: "利用" },
];

export function ReviewPanel() {
  const [records, setRecords] = useState<StudyRecord[]>(() => loadStudyRecords());
  const [completedDates, setCompletedDates] = useState<string[]>(() => loadCompletedDates());
  const summary = useMemo(() => summarizeReviews(records, demoVocabulary.map((item) => item.id), today), [records]);
  const queue = useMemo(() => getReviewQueue(records), [records]);
  const streak = calculateStreak(completedDates, today);

  function completeToday() {
    setCompletedDates(markDateCompleted(today));
  }

  return (
    <section className="review-shell">
      <header className="review-header">
        <div>
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
        <div><span>今日状态</span><strong>{summary.completedToday ? "已完成" : "待完成"}</strong></div>
      </div>
      <div className="review-card">
        <div className="review-card-heading"><div><h2>错题队列</h2><p>共 {queue.length} 个词条等待巩固</p></div><button type="button" onClick={completeToday} disabled={summary.completedToday}>完成今日打卡</button></div>
        {queue.length ? <ul className="review-list">{queue.map((record) => <li key={record.id}><div><strong>{record.vocabularyId}</strong><span>{record.correct ? "正在巩固" : "需要复习"}</span></div><em>连续正确 {record.consecutiveCorrect} 次</em></li>)}</ul> : <div className="review-empty">目前没有待复习错题，完成今日测试后会自动记录。</div>}
      </div>
    </section>
  );
}
