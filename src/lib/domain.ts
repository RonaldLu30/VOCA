export type ReviewStatus = "new" | "learning" | "mastered";

export type Difficulty = "easy" | "medium" | "hard";

export interface VocabularyEntry {
  id: string;
  phrase: string;
  meanings: string[];
  phonetic?: string;
  partOfSpeech?: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
  memoryTip?: string;
  audioUrl?: string;
  difficulty?: Difficulty;
}

export interface VocabularyList {
  id: string;
  title: string;
  studyDate: string;
  entries: VocabularyEntry[];
  createdAt: string;
}

export interface StudyRecord {
  id: string;
  vocabularyId: string;
  answer: string;
  acceptedAnswer: string;
  correct: boolean;
  consecutiveCorrect: number;
  status: ReviewStatus;
  answeredAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  phone: string;
  createdAt: string;
}
