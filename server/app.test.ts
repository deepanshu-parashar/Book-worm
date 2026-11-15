import { describe, expect, it } from 'vitest';
import { emptyProfile, type BookScanResponse, type ShelfScanResponse } from '../shared/types.ts';
import { AiUnavailable, type Analyzer } from './ai/claude.ts';
import type { ModelBook } from './ai/schema.ts';
import { createApp } from './app.ts';
import type { LookupResult } from './lookup/chain.ts';

const body = (over: object = {}) => JSON.stringify({ image: 'aGk=', mediaType: 'image/jpeg', lang: 'en', profile: emptyProfile, feedback: [], ...over });
const post = (app: ReturnType<typeof createApp>, path: string, b: string) =>
  app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b });

const book = (title: string, fit: number, knowsBook = true): ModelBook => ({
  title, author: 'Someone', isbn: null, language: 'de', firstPublished: 1960, knowsBook,
  summary: knowsBook ? 'Summary.' : null, genreKey: 'fiction', genreLabel: 'Fiction', difficulty: 'medium', fit, reason: 'Because.',
});
const hit: LookupResult = { hit: { title: 't', pages: 200 }, sources: ['dnb'], failed: [] };
const analyzer = (books: ModelBook[] | Error): Analyzer => ({
  async analyze() { if (books instanceof Error) throw books; return books; },
});

describe('API', () => {
  it('serves sample data without a model', async () => {
    const app = createApp({ analyzer: null, lookup: async () => hit });
    const res = await post(app, '/api/scan/shelf', body());
    const json = (await res.json()) as ShelfScanResponse;
    expect(json.mock).toBe(true);
    expect(json.results.length).toBeGreaterThan(3);
    expect(json.results.find((r) => r.book.confidence === 'unknown')?.score.value).toBe(0);
  });

  it('applies the taste profile to sample data too', async () => {
    const app = createApp({ analyzer: null, lookup: async () => hit });
    const res = await post(app, '/api/scan/shelf', body({ profile: { ...emptyProfile, excludedGenres: ['thriller'] } }));
    const json = (await res.json()) as ShelfScanResponse;
    expect(json.results.find((r) => r.book.genreKey === 'thriller')?.score.cappedBy).toBe('excludedGenre');
  });

  it('returns every book the model read on a shelf', async () => {
    const app = createApp({ analyzer: analyzer([book('A', 90), book('B', 30), book('C', 0, false)]), lookup: async () => hit });
    const json = (await (await post(app, '/api/scan/shelf', body())).json()) as ShelfScanResponse;
    expect(json.mock).toBe(false);
    expect(json.results.map((r) => r.book.title)).toEqual(['A', 'B', 'C']);
  });

  it('returns one book, or null, for a single-book scan', async () => {
    const one = createApp({ analyzer: analyzer([book('A', 90), book('B', 30)]), lookup: async () => hit });
    expect(((await (await post(one, '/api/scan/book', body())).json()) as BookScanResponse).result?.book.title).toBe('A');
    const empty = createApp({ analyzer: analyzer([]), lookup: async () => hit });
    expect(((await (await post(empty, '/api/scan/book', body())).json()) as BookScanResponse).result).toBeNull();
  });

  it('rejects bad requests', async () => {
    const app = createApp({ analyzer: null, lookup: async () => hit });
    expect((await post(app, '/api/scan/shelf', 'not json')).status).toBe(400);
    expect((await post(app, '/api/scan/shelf', body({ image: '' }))).status).toBe(400);
    expect((await post(app, '/api/scan/shelf', body({ mediaType: 'application/pdf' }))).status).toBe(400);
  });

  it('reports a model outage as 502 without leaking details', async () => {
    const app = createApp({ analyzer: analyzer(new AiUnavailable('Claude API error 529')), lookup: async () => hit });
    const res = await post(app, '/api/scan/shelf', body());
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ error: 'ai_unavailable' });
  });

  it('reports unexpected failures as 500', async () => {
    const app = createApp({ analyzer: analyzer(new Error('boom')), lookup: async () => hit });
    const res = await post(app, '/api/scan/shelf', body());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('boom');
  });
});
