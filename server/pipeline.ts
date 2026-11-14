import type { Book, Confidence, ScanRequest, ScoredBook } from '../shared/types.ts';
import type { ModelBook } from './ai/schema.ts';
import type { LookupResult } from './lookup/chain.ts';
import { normalizeIsbn } from './lookup/isbn.ts';
import { normalize } from './lookup/text.ts';
import type { LookupQuery } from './lookup/types.ts';
import { applyRules } from './scoring/rules.ts';

export type LookupFn = (q: LookupQuery) => Promise<LookupResult>;

export const MAX_BOOKS = 60;
const LOOKUP_CONCURRENCY = 6;

/**
 * known      the model knows the book and a catalogue confirms it exists
 * uncertain  only one of the two holds
 * unknown    neither: no summary, no score
 */
export function deriveConfidence(modelKnows: boolean, catalogueHit: boolean): Confidence {
  if (modelKnows && catalogueHit) return 'known';
  if (modelKnows || catalogueHit) return 'uncertain';
  return 'unknown';
}

/** Stable across scans, so the same book in two photos is one entry in My finds. */
export function bookId(title: string, author?: string | null): string {
  return ['b', normalize(title), normalize(author ?? '')].filter(Boolean).join('-').replace(/ /g, '-');
}

function assemble(m: ModelBook, lookup: LookupResult, req: ScanRequest): ScoredBook {
  const hit = lookup.hit;
  const isbn = normalizeIsbn(m.isbn);
  const confidence = deriveConfidence(m.knowsBook, hit !== null);
  const author = m.author?.trim() || hit?.author;
  const book: Book = {
    id: bookId(m.title, author),
    title: m.title.trim(),
    author,
    // An ISBN names this exact edition. Otherwise the model's first-publication year is the
    // better figure for a book it knows; a title search only sees arbitrary reprints.
    year: (isbn && hit?.year) || (m.knowsBook ? m.firstPublished ?? undefined : undefined) || hit?.year,
    pages: hit?.pages,
    language: m.language?.slice(0, 2).toLowerCase() || hit?.language,
    genre: m.genreLabel ?? undefined,
    genreKey: m.genreKey ?? undefined,
    isbn: hit?.isbn ?? isbn,
    coverUrl: hit?.coverUrl,
    summary: m.knowsBook ? m.summary?.trim() || undefined : undefined,
    difficulty: m.knowsBook ? m.difficulty ?? undefined : undefined,
    confidence,
    sources: lookup.sources,
  };
  return { book, score: applyRules(m.fit, m.reason.trim(), book, req.profile, req.lang) };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const NO_HIT: LookupResult = { hit: null, sources: [], failed: [] };

/** Model output → catalogue check → confidence → rule-adjusted score. */
export async function buildResults(models: ModelBook[], req: ScanRequest, lookup: LookupFn): Promise<ScoredBook[]> {
  const seen = new Set<string>();
  const unique = models.filter((m) => {
    if (!m.title?.trim()) return false;
    const id = bookId(m.title, m.author);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, MAX_BOOKS);

  return mapLimit(unique, LOOKUP_CONCURRENCY, async (m) => {
    const query: LookupQuery = {
      isbn: m.isbn ?? undefined,
      title: m.title,
      author: m.author ?? undefined,
      language: m.language?.slice(0, 2).toLowerCase() || undefined,
    };
    // A failed lookup must never lose the book; it only lowers the confidence.
    const result = await lookup(query).catch(() => NO_HIT);
    return assemble(m, result, req);
  });
}
