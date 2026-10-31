import type { ReviewStatus, StudyRecord } from "./domain";
import { getStudyDate } from "./study-date";

export interface ReviewSummary {
  total: number;
  due: number;
  mastered: number;
  accuracy: number;
  completedToday: boolean;
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[.,!?;:"'()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerAccepted(answer: string, acceptedAnswers: string[]): boolean {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && acceptedAnswers.some((candidate) => normalizeAnswer(candidate) === normalized);
}

export function getNextReviewStatus(consecutiveCorrect: number): ReviewStatus {
  if (consecutiveCorrect >= 3) return "mastered";
  if (consecutiveCorrect > 0) return "learning";
  return "new";
}

export function createStudyRecord(input: {
  vocabularyId: string;
  answer: string;
  acceptedAnswers: string[];
  previous?: StudyRecord;
  answeredAt?: string;
}): StudyRecord {
  const correct = isAnswerAccepted(input.answer, input.acceptedAnswers);
  const consecutiveCorrect = correct ? (input.previous?.consecutiveCorrect ?? 0) + 1 : 0;
  return {
    id: `${input.vocabularyId}-${Date.now()}`,
    vocabularyId: input.vocabularyId,
    answer: input.answer,
    acceptedAnswer: input.acceptedAnswers[0] ?? "",
    correct,
    consecutiveCorrect,
    status: getNextReviewStatus(consecutiveCorrect),
    answeredAt: input.answeredAt ?? new Date().toISOString(),
  };
}

export function getLatestRecords(records: StudyRecord[]): StudyRecord[] {
  const latest = new Map<string, StudyRecord>();
  for (const record of records) {
    const current = latest.get(record.vocabularyId);
    if (!current || current.answeredAt < record.answeredAt) latest.set(record.vocabularyId, record);
  }
  return [...latest.values()];
}

export function getReviewQueue(records: StudyRecord[]): StudyRecord[] {
  return getLatestRecords(records)
    .filter((record) => !record.correct || record.status !== "mastered")
    .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
}

export function isDailyTestComplete(records: Pick<StudyRecord, "vocabularyId" | "correct" | "consecutiveCorrect" | "answeredAt">[], vocabularyIds: string[], studyDate: string): boolean {
  const todayRecords = records.filter((record) => getStudyDate(new Date(record.answeredAt)) === studyDate);
  const latest = new Map<string, (typeof todayRecords)[number]>();
  const missed = new Set<string>();
  for (const record of todayRecords) {
    if (!record.correct) missed.add(record.vocabularyId);
    const previous = latest.get(record.vocabularyId);
    if (!previous || previous.answeredAt <= record.answeredAt) latest.set(record.vocabularyId, record);
  }
  return vocabularyIds.length > 0 && vocabularyIds.every((id) => {
    const record = latest.get(id);
    return record?.correct && (!missed.has(id) || record.consecutiveCorrect >= 3);
  });
}

export function summarizeReviews(records: StudyRecord[], vocabularyIds: string[], studyDate: string): ReviewSummary {
  const latest = getLatestRecords(records);
  const answered = records.filter((record) => getStudyDate(new Date(record.answeredAt)) === studyDate);
  const correct = answered.filter((record) => record.correct).length;
  return {
    total: vocabularyIds.length,
    due: getReviewQueue(records).length,
    mastered: latest.filter((record) => record.status === "mastered").length,
    accuracy: answered.length ? Math.round((correct / answered.length) * 100) : 0,
    completedToday: isDailyTestComplete(records, vocabularyIds, studyDate),
  };
}

export function calculateStreak(completedDates: string[], today: string): number {
  const dates = new Set(completedDates);
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
