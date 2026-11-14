export type Lang = 'de' | 'en';
export type Confidence = 'known' | 'uncertain' | 'unknown';
export type Difficulty = 'easy' | 'medium' | 'demanding';

export interface Book {
  id: string;
  title: string;
  author?: string;
  year?: number;
  pages?: number;
  /** ISO 639-1 code of the book's language, e.g. "de". */
  language?: string;
  /** Display label in the user's language. */
  genre?: string;
  /** Key from shared/genres.ts, used by the scoring rules. */
  genreKey?: string;
  isbn?: string;
  coverUrl?: string;
  /** Written by the model in its own words. Absent when confidence is "unknown". */
  summary?: string;
  difficulty?: Difficulty;
  confidence: Confidence;
  /** Catalogues that confirmed this book, e.g. ["dnb"]. */
  sources: string[];
}

export interface TasteProfile {
  lovedBooks: string[];
  dislikedBooks: string[];
  genres: string[];
  excludedGenres: string[];
  /** ISO 639-1 codes the user reads. Empty means "any". */
  languages: string[];
  maxPages?: number;
  notes: string;
}

export interface Score {
  /** 0–100. */
  value: number;
  reason: string;
  /** Set when a hard rule changed the model's score, e.g. "excludedGenre". */
  cappedBy?: string;
}

export interface ScoredBook {
  book: Book;
  score: Score;
}

export type Decision = 'took' | 'skipped';
export type Verdict = 'liked' | 'disliked' | 'unread';

export interface Find extends ScoredBook {
  decision: Decision;
  verdict?: Verdict;
  date: string;
}

/** Compact feedback line sent with scans so the model can learn from past finds. */
export interface FeedbackItem {
  title: string;
  author?: string;
  decision: Decision;
  verdict?: Verdict;
}

export interface ScanRequest {
  /** Base64 JPEG without the data: prefix. Held in memory for the request only. */
  image: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  lang: Lang;
  profile: TasteProfile;
  feedback: FeedbackItem[];
}

export interface BookScanResponse {
  result: ScoredBook | null;
  mock: boolean;
}

export interface ShelfScanResponse {
  results: ScoredBook[];
  mock: boolean;
}

export interface ApiError {
  error: 'bad_request' | 'ai_unavailable' | 'server_error';
  message: string;
}

export const emptyProfile: TasteProfile = {
  lovedBooks: [],
  dislikedBooks: [],
  genres: [],
  excludedGenres: [],
  languages: [],
  notes: '',
};
