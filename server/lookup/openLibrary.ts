import type { CatalogueHit, Provider } from './types.ts';
import { hitMatchesQuery, toIso6391 } from './text.ts';

const ENDPOINT = 'https://openlibrary.org/search.json';
const FIELDS = 'key,title,author_name,first_publish_year,number_of_pages_median,language,cover_i';

interface Doc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  language?: string[];
  cover_i?: number;
}

export function parseOpenLibrary(json: unknown): CatalogueHit[] {
  const docs = (json as { docs?: Doc[] })?.docs ?? [];
  const hits: CatalogueHit[] = [];
  for (const d of docs) {
    if (!d.title) continue;
    hits.push({
      source: 'openLibrary',
      title: d.title,
      author: d.author_name?.[0],
      year: d.first_publish_year,
      pages: d.number_of_pages_median,
      // A work lists every translation; only a single language says something about this copy.
      language: d.language?.length === 1 ? toIso6391(d.language[0]) : undefined,
      coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : undefined,
    });
  }
  return hits;
}

export const openLibrary: Provider = {
  name: 'openLibrary',
  async lookup(q, fetchFn) {
    const params = new URLSearchParams({ limit: '5', fields: FIELDS });
    if (q.isbn) params.set('isbn', q.isbn);
    else if (q.title) {
      params.set('title', q.title);
      if (q.author) params.set('author', q.author);
    } else return null;
    const res = await fetchFn(`${ENDPOINT}?${params}`);
    if (!res.ok) throw new Error(`Open Library responded ${res.status}`);
    const hits = parseOpenLibrary(await res.json()).filter((h) => hitMatchesQuery(q, h));
    return hits[0] ?? null;
  },
};
