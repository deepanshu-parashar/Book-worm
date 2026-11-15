import type { ScoredBook } from '../../../shared/types.ts';

export const TOP_COUNT = 5;
/** Below this a book is listed but not recommended. */
export const MIN_RECOMMEND = 50;

/** Top picks are the best-scoring books we actually know; unknown books are never recommended. */
export function splitShelf(results: ScoredBook[]): { top: ScoredBook[]; rest: ScoredBook[] } {
  const sorted = [...results].sort((a, b) => b.score.value - a.score.value);
  const top = sorted
    .filter((r) => r.book.confidence !== 'unknown' && r.score.cappedBy !== 'unknown' && r.score.value >= MIN_RECOMMEND)
    .slice(0, TOP_COUNT);
  const rest = sorted.filter((r) => !top.includes(r));
  return { top, rest };
}
