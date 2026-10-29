import type { StudyRecord } from "./domain";

const RECORDS_KEY = "wordkiller.study-records";
const COMPLETED_DATES_KEY = "wordkiller.completed-dates";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function loadStudyRecords(): StudyRecord[] {
  if (!canUseStorage()) return [];
  try {
    const value = window.localStorage.getItem(RECORDS_KEY);
    return value ? (JSON.parse(value) as StudyRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveStudyRecords(records: StudyRecord[]): void {
  if (canUseStorage()) window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function appendStudyRecord(record: StudyRecord): StudyRecord[] {
  const records = [...loadStudyRecords(), record];
  saveStudyRecords(records);
  return records;
}

export function loadCompletedDates(): string[] {
  if (!canUseStorage()) return [];
  try {
    const value = window.localStorage.getItem(COMPLETED_DATES_KEY);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

export function markDateCompleted(date: string): string[] {
  const dates = [...new Set([...loadCompletedDates(), date])].sort();
  if (canUseStorage()) window.localStorage.setItem(COMPLETED_DATES_KEY, JSON.stringify(dates));
  return dates;
}
