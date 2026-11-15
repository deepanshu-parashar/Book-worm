import type { FeedbackItem, Find, TasteProfile } from '../../../shared/types.ts';

// Everything the app remembers lives in this browser's localStorage. Nothing is synced.
const PREFIX = 's2r.';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the app keeps working for this session.
  }
}

export const loadProfile = () => load<TasteProfile | null>('profile', null);
export const saveProfile = (p: TasteProfile) => save('profile', p);

export const loadFinds = () => load<Find[]>('finds', []);
export const saveFinds = (f: Find[]) => save('finds', f);

/** Most recent finds, compacted for the scoring prompt. */
export function recentFeedback(finds: Find[], limit = 30): FeedbackItem[] {
  return finds.slice(0, limit).map((f) => ({
    title: f.book.title,
    author: f.book.author,
    decision: f.decision,
    verdict: f.verdict,
  }));
}
