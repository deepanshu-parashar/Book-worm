import { describe, expect, it } from 'vitest';
import { emptyProfile, type ScanRequest } from '../shared/types.ts';
import type { ModelBook } from './ai/schema.ts';
import type { LookupResult } from './lookup/chain.ts';
import { bookId, buildResults, deriveConfidence, MAX_BOOKS } from './pipeline.ts';

const req: ScanRequest = { image: 'x', mediaType: 'image/jpeg', lang: 'en', profile: emptyProfile, feedback: [] };
const model = (over: Partial<ModelBook> = {}): ModelBook => ({
  title: 'Homo faber', author: 'Max Frisch', isbn: null, language: 'de', firstPublished: 1957, knowsBook: true,
  summary: 'An engineer meets fate.', genreKey: 'fiction', genreLabel: 'Literary fiction', difficulty: 'medium',
  fit: 80, reason: 'Fits.', ...over,
});
const found: LookupResult = { hit: { title: 'Homo faber', author: 'Max Frisch', pages: 202, year: 2021, language: 'de' }, sources: ['dnb'], failed: [] };
const none: LookupResult = { hit: null, sources: [], failed: [] };

describe('deriveConfidence', () => {
  it('needs both the model and a catalogue for "known"', () => {
    expect(deriveConfidence(true, true)).toBe('known');
    expect(deriveConfidence(true, false)).toBe('uncertain');
    expect(deriveConfidence(false, true)).toBe('uncertain');
    expect(deriveConfidence(false, false)).toBe('unknown');
  });
});

describe('buildResults', () => {
  it('merges model and catalogue facts for a known book', async () => {
    const [r] = await buildResults([model()], req, async () => found);
    expect(r.book).toMatchObject({
      title: 'Homo faber', author: 'Max Frisch', pages: 202, year: 1957, confidence: 'known',
      summary: 'An engineer meets fate.', sources: ['dnb'],
    });
    expect(r.score).toEqual({ value: 80, reason: 'Fits.' });
  });

  it('uses the catalogue year when an ISBN pins the edition', async () => {
    const [r] = await buildResults([model({ isbn: '978-3-518-36854-1' })], req, async () => found);
    expect(r.book.year).toBe(2021);
    expect(r.book.isbn).toBe('9783518368541');
  });

  it('never shows a summary for a book the model does not know', async () => {
    const guess = model({ knowsBook: false, summary: 'A plausible invention.', difficulty: 'easy', fit: 60 });
    const [inCatalogue] = await buildResults([guess], req, async () => found);
    expect(inCatalogue.book.confidence).toBe('uncertain');
    expect(inCatalogue.book.summary).toBeUndefined();
    expect(inCatalogue.book.pages).toBe(202);

    const [nowhere] = await buildResults([guess], req, async () => none);
    expect(nowhere.book.confidence).toBe('unknown');
    expect(nowhere.book.summary).toBeUndefined();
    expect(nowhere.score.value).toBe(0);
  });

  it('keeps the book when the lookup throws', async () => {
    const [r] = await buildResults([model()], req, async () => { throw new Error('offline'); });
    expect(r.book).toMatchObject({ title: 'Homo faber', confidence: 'uncertain', sources: [] });
    expect(r.book.summary).toBeDefined();
  });

  it('handles a book with no metadata at all', async () => {
    const bare = model({ author: null, language: null, firstPublished: null, knowsBook: false, summary: null, genreKey: null, genreLabel: null, difficulty: null, fit: 0 });
    const [r] = await buildResults([bare], req, async () => none);
    expect(r.book).toMatchObject({ title: 'Homo faber', confidence: 'unknown' });
    expect(r.book.author).toBeUndefined();
  });

  it('drops blank titles and duplicate spines, and caps the list', async () => {
    const res = await buildResults([model(), model({ title: 'HOMO FABER' }), model({ title: '  ' })], req, async () => found);
    expect(res).toHaveLength(1);
    const many = Array.from({ length: MAX_BOOKS + 10 }, (_, i) => model({ title: `Book ${i}` }));
    expect(await buildResults(many, req, async () => none)).toHaveLength(MAX_BOOKS);
  });

  it('applies the reader\'s limits on top of the model score', async () => {
    const strict = { ...req, profile: { ...emptyProfile, maxPages: 150 } };
    const [r] = await buildResults([model()], strict, async () => found);
    expect(r.score.cappedBy).toBe('length');
    expect(r.score.value).toBe(60);
  });

  it('gives the same id to the same book across scans', () => {
    expect(bookId('Die Brücke', 'Max Frisch')).toBe(bookId('die bruecke ', 'MAX FRISCH'));
  });
});
