import type { CatalogueHit, Provider } from './types.ts';
import { hitMatchesQuery, parseYear } from './text.ts';
import { normalizeIsbn } from './isbn.ts';

const ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';

interface Volume {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string };
    // `description` exists in the API but is a publisher blurb. It is deliberately not read.
  };
}

export function parseGoogleBooks(json: unknown): CatalogueHit[] {
  const items = (json as { items?: Volume[] })?.items ?? [];
  const hits: CatalogueHit[] = [];
  for (const { volumeInfo: v } of items) {
    if (!v?.title) continue;
    hits.push({
      source: 'googleBooks',
      title: v.title,
      author: v.authors?.[0],
      year: parseYear(v.publishedDate),
      pages: v.pageCount && v.pageCount > 0 ? v.pageCount : undefined,
      language: v.language?.slice(0, 2),
      isbn: v.industryIdentifiers?.map((i) => normalizeIsbn(i.identifier)).find(Boolean),
      coverUrl: v.imageLinks?.thumbnail?.replace(/^http:/, 'https:'),
    });
  }
  return hits;
}

export function googleBooks(apiKey = ''): Provider {
  return {
    name: 'googleBooks',
    async lookup(q, fetchFn) {
      let query: string;
      if (q.isbn) query = `isbn:${q.isbn}`;
      else if (q.title) query = `intitle:"${q.title}"` + (q.author ? ` inauthor:"${q.author}"` : '');
      else return null;
      const params = new URLSearchParams({ q: query, maxResults: '5', printType: 'books' });
      if (q.language) params.set('langRestrict', q.language);
      if (apiKey) params.set('key', apiKey);
      const res = await fetchFn(`${ENDPOINT}?${params}`);
      if (!res.ok) throw new Error(`Google Books responded ${res.status}`);
      const hits = parseGoogleBooks(await res.json()).filter((h) => hitMatchesQuery(q, h));
      return hits.find((h) => h.pages) ?? hits[0] ?? null;
    },
  };
}
