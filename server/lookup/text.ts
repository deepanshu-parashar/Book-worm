import type { LookupQuery } from './types.ts';

/** Lowercase, strip accents and punctuation, fold German umlauts and ß. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Secondary literature shares the title of the work it discusses. */
const STUDY_GUIDE = /\b(interpretation|textanalyse|lektuere|lektuereschluessel|erlaeuterungen|unterrichtsmaterial|materialien|study guide)\b/;
const ARTICLES = /^(der|die|das|ein|eine|the|a|an) /;
const stripArticle = (s: string) => s.replace(ARTICLES, '');

/** True when a catalogue title is the queried book, not a study guide or a different work. */
export function titleMatches(queryTitle: string, hitTitle: string): boolean {
  const q = stripArticle(normalize(queryTitle));
  const h = stripArticle(normalize(hitTitle));
  if (!q || !h) return false;
  if (q === h) return true;
  // Allow a subtitle on either side ("Momo" vs "Momo oder Die seltsame Geschichte…"),
  // but only when the shorter title is specific enough to stand on its own.
  const [short, long] = q.length <= h.length ? [q, h] : [h, q];
  if (STUDY_GUIDE.test(long)) return false;
  return short.length >= 12 && long.startsWith(short + ' ');
}

/** True when the hit's author shares a surname-like token with the queried author. */
export function authorMatches(queryAuthor: string | undefined, hitAuthor: string | undefined): boolean {
  if (!queryAuthor || !hitAuthor) return true; // nothing to contradict
  const tokens = (s: string) => normalize(s).split(' ').filter((t) => t.length > 2);
  const hit = new Set(tokens(hitAuthor));
  return tokens(queryAuthor).some((t) => hit.has(t));
}

export function hitMatchesQuery(query: LookupQuery, hit: { title: string; author?: string }): boolean {
  if (!query.title) return true; // ISBN-only lookups are exact by construction
  return titleMatches(query.title, hit.title) && authorMatches(query.author, hit.author);
}

const ISO_639_2: Record<string, string> = {
  ger: 'de', deu: 'de', eng: 'en', fre: 'fr', fra: 'fr', spa: 'es', ita: 'it', dut: 'nl', nld: 'nl',
  rus: 'ru', pol: 'pl', lat: 'la', tur: 'tr', por: 'pt', swe: 'sv', dan: 'da', cze: 'cs', ces: 'cs',
};
export function toIso6391(code: string | undefined): string | undefined {
  if (!code) return undefined;
  const c = code.trim().toLowerCase();
  if (c.length === 2) return c;
  return ISO_639_2[c];
}

export function parseYear(s: string | undefined): number | undefined {
  const m = s?.match(/\b(1[4-9]\d\d|20\d\d)\b/);
  return m ? Number(m[1]) : undefined;
}
