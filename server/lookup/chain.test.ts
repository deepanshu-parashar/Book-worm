import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lookupChain } from './chain.ts';
import { dnb, dnbQuery, parseDnbRecords, pickDnbHit } from './dnb.ts';
import { googleBooks, parseGoogleBooks } from './googleBooks.ts';
import { openLibrary, parseOpenLibrary } from './openLibrary.ts';
import { normalizeIsbn } from './isbn.ts';
import { authorMatches, titleMatches } from './text.ts';
import type { CatalogueHit, FetchLike, Provider, SourceName } from './types.ts';

const fx = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

function stub(name: SourceName, result: Partial<CatalogueHit> | null | Error, calls: string[] = []): Provider {
  return {
    name,
    async lookup(q) {
      calls.push(`${name}:${q.isbn ?? q.title}`);
      if (result instanceof Error) throw result;
      return result ? { source: name, title: 'Homo faber', ...result } : null;
    },
  };
}

/** Routes real provider code to recorded responses by hostname. */
function recorded(routes: Record<string, { status?: number; body: string } | Error>): FetchLike {
  return async (url) => {
    const host = new URL(url).hostname;
    const r = routes[host];
    if (!r) throw new Error(`unexpected host ${host}`);
    if (r instanceof Error) throw r;
    return new Response(r.body, { status: r.status ?? 200 });
  };
}

describe('lookupChain', () => {
  it('stops at the first catalogue when it has everything', async () => {
    const calls: string[] = [];
    const res = await lookupChain({ isbn: '9783518368541' }, [
      stub('dnb', { pages: 202, year: 1996, coverUrl: 'https://c/x.jpg' }, calls),
      stub('googleBooks', { pages: 999 }, calls),
    ]);
    expect(res.sources).toEqual(['dnb']);
    expect(res.hit?.pages).toBe(202);
    expect(calls).toEqual(['dnb:9783518368541']);
  });

  it('falls through when the first catalogue has no match', async () => {
    const res = await lookupChain({ isbn: '9783518368541' }, [
      stub('dnb', null),
      stub('googleBooks', { pages: 203, year: 1977, coverUrl: 'https://c/g.jpg' }),
      stub('openLibrary', { pages: 1 }),
    ]);
    expect(res.sources).toEqual(['googleBooks']);
    expect(res.hit?.pages).toBe(203);
  });

  it('fills missing fields from later catalogues without overwriting earlier ones', async () => {
    const res = await lookupChain({ title: 'Homo faber', author: 'Max Frisch' }, [
      stub('dnb', { pages: 202, year: 1957 }),
      stub('googleBooks', null),
      stub('openLibrary', { pages: 237, year: 1900, coverUrl: 'https://c/ol.jpg' }),
    ]);
    expect(res.sources).toEqual(['dnb', 'openLibrary']);
    expect(res.hit).toMatchObject({ pages: 202, year: 1957, coverUrl: 'https://c/ol.jpg' });
  });

  it('skips a catalogue that is down and reports it', async () => {
    const res = await lookupChain({ isbn: '9783518368541' }, [
      stub('dnb', new Error('timeout')),
      stub('googleBooks', new Error('429')),
      stub('openLibrary', { pages: 237 }),
    ]);
    expect(res.sources).toEqual(['openLibrary']);
    expect(res.failed).toEqual(['dnb', 'googleBooks']);
  });

  it('returns no hit when every catalogue is down', async () => {
    const res = await lookupChain({ title: 'Momo' }, [stub('dnb', new Error('x')), stub('openLibrary', new Error('y'))]);
    expect(res).toEqual({ hit: null, sources: [], failed: ['dnb', 'openLibrary'] });
  });

  it('returns no hit when nobody knows the book', async () => {
    const res = await lookupChain({ title: 'Heimatkalender 1962' }, [stub('dnb', null), stub('openLibrary', null)]);
    expect(res).toEqual({ hit: null, sources: [], failed: [] });
  });

  it('does not call any catalogue without an ISBN or a title', async () => {
    const calls: string[] = [];
    const res = await lookupChain({ author: 'Max Frisch' }, [stub('dnb', { pages: 1 }, calls)]);
    expect(res.hit).toBeNull();
    expect(calls).toEqual([]);
  });

  it('drops a misread ISBN and searches by title instead', async () => {
    const calls: string[] = [];
    await lookupChain({ isbn: '9783518368549', title: 'Homo faber' }, [stub('dnb', null, calls)]);
    expect(calls).toEqual(['dnb:Homo faber']);
  });

  it('retries by title when a valid ISBN is in no catalogue', async () => {
    const calls: string[] = [];
    const byTitleOnly: Provider = {
      name: 'dnb',
      async lookup(q) {
        calls.push(q.isbn ? 'isbn' : 'title');
        return q.isbn ? null : { source: 'dnb', title: 'Homo faber', pages: 202 };
      },
    };
    const res = await lookupChain({ isbn: '3518368540', title: 'Homo faber' }, [byTitleOnly]);
    expect(calls).toEqual(['isbn', 'title']);
    expect(res.hit?.pages).toBe(202);
  });

  it('runs the real providers against recorded responses', async () => {
    const fetchFn = recorded({
      'services.dnb.de': { body: fx('dnb-isbn.xml') },
      'www.googleapis.com': { status: 429, body: '{}' },
      'openlibrary.org': { body: fx('open-library.json') },
    });
    const res = await lookupChain({ isbn: '9783518368541' }, [dnb, googleBooks(), openLibrary], { fetchFn });
    expect(res.sources).toEqual(['dnb', 'openLibrary']);
    expect(res.failed).toEqual(['googleBooks']);
    expect(res.hit).toMatchObject({
      title: 'Homo faber', author: 'Max Frisch', pages: 202, year: 1996, language: 'de',
      isbn: '9783518368541', coverUrl: 'https://covers.openlibrary.org/b/id/116218-M.jpg',
    });
  });
});

describe('DNB', () => {
  it('parses a MARC record', () => {
    expect(parseDnbRecords(fx('dnb-isbn.xml'))[0]).toEqual({
      source: 'dnb', title: 'Homo faber', author: 'Max Frisch', year: 1996, pages: 202, language: 'de', isbn: '9783518368541',
    });
  });

  it('rejects study guides and retitled translations on a title search', () => {
    const hits = parseDnbRecords(fx('dnb-title.xml'));
    expect(hits.map((h) => h.title)).toContain('Homo faber von Max Frisch - Textanalyse und Interpretation');
    const picked = pickDnbHit({ title: 'Homo faber', author: 'Max Frisch' }, hits);
    expect(picked?.title).toBe('Homo faber');
    expect(picked?.isbn).toBeUndefined(); // an arbitrary edition's ISBN is not this copy's
  });

  it('returns null when only other works match the search', () => {
    const hits = parseDnbRecords(fx('dnb-title.xml')).filter((h) => h.title !== 'Homo faber');
    expect(pickDnbHit({ title: 'Homo faber', author: 'Max Frisch' }, hits)).toBeNull();
  });

  it('prefers the edition in the language of the copy in hand', () => {
    const hits: CatalogueHit[] = [
      { source: 'dnb', title: 'Momo', author: 'Michael Ende', language: 'en', pages: 230, year: 1985 },
      { source: 'dnb', title: 'Momo', author: 'Michael Ende', language: 'de', pages: 269, year: 1973 },
    ];
    expect(pickDnbHit({ title: 'Momo', author: 'Michael Ende', language: 'de' }, hits)).toMatchObject({ pages: 269, language: 'de' });
  });

  it('does not trust one arbitrary edition on a title search', () => {
    const ed = (pages: number, year: number): CatalogueHit => ({ source: 'dnb', title: 'Momo', author: 'Michael Ende', pages, year });
    // Newest first, as DNB returns them: an 88-page abridged reprint leads the list.
    const picked = pickDnbHit({ title: 'Momo', author: 'Michael Ende' }, [ed(88, 2025), ed(304, 2021), ed(269, 1973)]);
    expect(picked?.pages).toBe(269);
    expect(picked?.year).toBeUndefined();
  });

  it('builds CQL queries', () => {
    expect(dnbQuery({ isbn: '9783518368541' })).toBe('num=9783518368541');
    expect(dnbQuery({ title: 'Homo "faber"', author: 'Max Frisch' })).toBe('tit="Homo  faber " and per="Frisch" and mat=books');
    expect(dnbQuery({ author: 'Max Frisch' })).toBeNull();
  });

  it('treats a server error as a failure, not as "no match"', async () => {
    const fetchFn = recorded({ 'services.dnb.de': { status: 503, body: '' } });
    await expect(dnb.lookup({ isbn: '9783518368541' }, fetchFn)).rejects.toThrow('503');
  });
});

describe('Google Books and Open Library', () => {
  it('parses Google Books without ever reading the publisher blurb', () => {
    const [hit] = parseGoogleBooks(JSON.parse(fx('google-books.json')));
    expect(hit).toMatchObject({ title: 'Homo faber', author: 'Max Frisch', year: 1977, pages: 203, language: 'de', isbn: '9783518368541' });
    expect(hit.coverUrl).toMatch(/^https:/);
    expect(JSON.stringify(hit)).not.toContain('BLURB');
  });

  it('parses Open Library and ignores the language of multi-language works', () => {
    const [hit] = parseOpenLibrary(JSON.parse(fx('open-library.json')));
    expect(hit).toMatchObject({ title: 'Homo Faber', year: 1957, pages: 237 });
    expect(hit.language).toBeUndefined();
  });

  it('handles empty and malformed bodies', () => {
    expect(parseGoogleBooks({ totalItems: 0 })).toEqual([]);
    expect(parseOpenLibrary(null)).toEqual([]);
    expect(parseDnbRecords('<html>gateway error</html>')).toEqual([]);
  });
});

describe('matching helpers', () => {
  it('validates and converts ISBNs', () => {
    expect(normalizeIsbn('978-3-518-36854-1')).toBe('9783518368541');
    expect(normalizeIsbn('3-518-36854-0')).toBe('9783518368541');
    expect(normalizeIsbn('9783518368549')).toBeUndefined();
    expect(normalizeIsbn('ISBN unknown')).toBeUndefined();
    expect(normalizeIsbn(null)).toBeUndefined();
  });

  it('matches titles across case, umlauts, articles and subtitles', () => {
    expect(titleMatches('HOMO FABER', 'Homo faber')).toBe(true);
    expect(titleMatches('Die Blechtrommel', 'Blechtrommel')).toBe(true);
    expect(titleMatches('Buddenbrooks', 'Buddenbrooks Verfall einer Familie')).toBe(true);
    expect(titleMatches('Die Bruecke', 'Die Brücke')).toBe(true);
    expect(titleMatches('Homo faber', 'Homo faber von Max Frisch - Textanalyse und Interpretation')).toBe(false);
    expect(titleMatches('Momo', 'Momo und die Zeitdiebe')).toBe(false);
    expect(titleMatches('Die Blechtrommel', 'Die Blechtrommel von Günter Grass. Textanalyse und Interpretation')).toBe(false);
  });

  it('matches authors by surname and tolerates a missing author', () => {
    expect(authorMatches('Max Frisch', 'Frisch, Max')).toBe(true);
    expect(authorMatches('M. Frisch', 'Max Frisch')).toBe(true);
    expect(authorMatches('Max Frisch', 'Günter Grass')).toBe(false);
    expect(authorMatches(undefined, 'Günter Grass')).toBe(true);
  });
});
