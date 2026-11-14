import type { CatalogueHit, LookupQuery, Provider } from './types.ts';
import { hitMatchesQuery, parseYear, toIso6391 } from './text.ts';
import { normalizeIsbn } from './isbn.ts';

const ENDPOINT = 'https://services.dnb.de/sru/dnb';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => ENTITIES[n])
    // DNB marks non-sorting articles with control characters.
    .replace(/[\u0098\u009c]/g, '')
    .trim();
}

/** All values of one MARC subfield within one record. */
function subfields(record: string, tag: string, code: string): string[] {
  const out: string[] = [];
  const fields = record.matchAll(new RegExp(`<datafield tag="${tag}"[^>]*>([\\s\\S]*?)</datafield>`, 'g'));
  for (const f of fields) {
    for (const s of f[1].matchAll(new RegExp(`<subfield code="${code}">([^<]*)</subfield>`, 'g'))) {
      out.push(decode(s[1]));
    }
  }
  return out;
}

function invertName(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const [last, first] = name.split(',').map((p) => p.trim());
  return first ? `${first} ${last}` : last;
}

function parsePages(extent: string | undefined): number | undefined {
  if (!extent) return undefined;
  const m = extent.match(/(\d+)\s*(S\.|Seiten|p\b|pages)/i) ?? extent.match(/(\d{2,4})/);
  return m ? Number(m[1]) : undefined;
}

export function parseDnbRecords(xml: string): CatalogueHit[] {
  const hits: CatalogueHit[] = [];
  for (const m of xml.matchAll(/<recordData>([\s\S]*?)<\/recordData>/g)) {
    const rec = m[1];
    const title = subfields(rec, '245', 'a')[0];
    if (!title) continue;
    const isbn = subfields(rec, '020', 'a').map(normalizeIsbn).find(Boolean);
    hits.push({
      source: 'dnb',
      title,
      author: invertName(subfields(rec, '100', 'a')[0]),
      year: parseYear(subfields(rec, '264', 'c')[0] ?? subfields(rec, '260', 'c')[0]),
      pages: parsePages(subfields(rec, '300', 'a')[0]),
      language: toIso6391(subfields(rec, '041', 'a')[0]),
      isbn,
    });
  }
  return hits;
}

const quote = (s: string) => `"${s.replace(/["\\]/g, ' ')}"`;

export function dnbQuery(q: LookupQuery): string | null {
  if (q.isbn) return `num=${q.isbn}`;
  if (!q.title) return null;
  const parts = [`tit=${quote(q.title)}`];
  // Surname only: DNB stores "Frisch, Max" and a full-name phrase often misses.
  const surname = q.author?.trim().split(/\s+/).pop();
  if (surname) parts.push(`per=${quote(surname)}`);
  parts.push('mat=books');
  return parts.join(' and ');
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/**
 * Pick the record that is this book, preferring the expected language.
 * An ISBN names one edition, so its facts are exact. A title search returns whichever
 * editions DNB lists first (usually recent reprints, sometimes abridged ones), so it only
 * confirms that the book exists: the year is dropped and the page count is the median.
 */
export function pickDnbHit(q: LookupQuery, hits: CatalogueHit[]): CatalogueHit | null {
  const matching = hits.filter((h) => hitMatchesQuery(q, h));
  if (matching.length === 0) return null;
  const sameLang = q.language ? matching.filter((h) => h.language === q.language) : [];
  const pool = sameLang.length > 0 ? sameLang : matching;
  if (q.isbn) return pool.find((h) => h.pages) ?? pool[0];
  const pages = median(pool.map((h) => h.pages).filter((n): n is number => !!n));
  return { ...pool[0], pages, year: undefined, isbn: undefined };
}

export const dnb: Provider = {
  name: 'dnb',
  async lookup(q, fetchFn) {
    const query = dnbQuery(q);
    if (!query) return null;
    const params = new URLSearchParams({
      version: '1.1', operation: 'searchRetrieve', query,
      recordSchema: 'MARC21-xml', maximumRecords: q.isbn ? '3' : '20',
    });
    const res = await fetchFn(`${ENDPOINT}?${params}`);
    if (!res.ok) throw new Error(`DNB responded ${res.status}`);
    return pickDnbHit(q, parseDnbRecords(await res.text()));
  },
};
