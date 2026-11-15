import type { CatalogueHit, FetchLike, LookupQuery, Provider, SourceName } from './types.ts';
import { normalizeIsbn } from './isbn.ts';

export interface LookupResult {
  /** Merged facts, or null when no catalogue knows the book. */
  hit: Omit<CatalogueHit, 'source'> | null;
  /** Catalogues that confirmed the book, in the order asked. */
  sources: SourceName[];
  /** Catalogues that could not be reached. */
  failed: SourceName[];
}

export interface ChainOptions {
  fetchFn?: FetchLike;
  timeoutMs?: number;
}

const WANTED = ['pages', 'year', 'coverUrl', 'language', 'author', 'isbn'] as const;
const isComplete = (h: Omit<CatalogueHit, 'source'>) => Boolean(h.pages && h.year && h.coverUrl);

/**
 * Ask each catalogue in order. The first hit sets the title; later catalogues only fill
 * fields that are still missing. A catalogue that fails is skipped, never fatal.
 * With an ISBN that finds nothing anywhere, retry once by title and author.
 */
export async function lookupChain(query: LookupQuery, providers: Provider[], opts: ChainOptions = {}): Promise<LookupResult> {
  const q: LookupQuery = { ...query, isbn: normalizeIsbn(query.isbn) };
  if (!q.isbn && !q.title) return { hit: null, sources: [], failed: [] };

  const first = await runChain(q, providers, opts);
  if (first.hit || !q.isbn || !q.title) return first;

  const retry = await runChain({ ...q, isbn: undefined }, providers, opts);
  return { ...retry, failed: [...new Set([...first.failed, ...retry.failed])] };
}

async function runChain(q: LookupQuery, providers: Provider[], opts: ChainOptions): Promise<LookupResult> {
  const fetchFn = opts.fetchFn ?? (fetch as FetchLike);
  const timeoutMs = opts.timeoutMs ?? 6000;
  let merged: Omit<CatalogueHit, 'source'> | null = null;
  const sources: SourceName[] = [];
  const failed: SourceName[] = [];

  for (const p of providers) {
    if (merged && isComplete(merged)) break;
    let hit: CatalogueHit | null;
    try {
      const timed: FetchLike = (url) => fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
      hit = await p.lookup(q, timed);
    } catch {
      failed.push(p.name);
      continue;
    }
    if (!hit) continue;
    sources.push(p.name);
    const { source: _source, ...facts } = hit;
    if (!merged) {
      merged = facts;
    } else {
      for (const key of WANTED) {
        if (merged[key] === undefined && facts[key] !== undefined) {
          (merged as Record<string, unknown>)[key] = facts[key];
        }
      }
    }
  }
  if (merged && !merged.isbn && q.isbn) merged.isbn = q.isbn;
  return { hit: merged, sources, failed };
}
