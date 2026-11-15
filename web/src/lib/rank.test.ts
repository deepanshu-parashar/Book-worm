import { describe, expect, it } from 'vitest';
import type { ScoredBook } from '../../../shared/types.ts';
import { MIN_RECOMMEND, splitShelf, TOP_COUNT } from './rank.ts';

const item = (id: string, value: number, confidence: ScoredBook['book']['confidence'] = 'known'): ScoredBook => ({
  book: { id, title: id, confidence, sources: [] }, score: { value, reason: '' },
});

describe('splitShelf', () => {
  it('recommends the best known books, best first, at most five', () => {
    const { top, rest } = splitShelf([60, 95, 70, 85, 55, 90, 80].map((v, i) => item(`b${i}`, v)));
    expect(top.map((r) => r.score.value)).toEqual([95, 90, 85, 80, 70]);
    expect(top).toHaveLength(TOP_COUNT);
    expect(rest.map((r) => r.score.value)).toEqual([60, 55]);
  });

  it('never recommends unknown or low-scoring books', () => {
    const { top, rest } = splitShelf([item('unknown', 99, 'unknown'), item('low', MIN_RECOMMEND - 1), item('ok', MIN_RECOMMEND, 'uncertain')]);
    expect(top.map((r) => r.book.id)).toEqual(['ok']);
    expect(rest).toHaveLength(2);
  });

  it('returns an empty recommendation when nothing fits', () => {
    expect(splitShelf([item('a', 10), item('b', 20)]).top).toEqual([]);
  });
});
