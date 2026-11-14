import { describe, expect, it } from 'vitest';
import { emptyProfile, type Book, type TasteProfile } from '../../shared/types.ts';
import { applyRules, FAR_OVER_LENGTH_PENALTY, HARD_CAP, OVER_LENGTH_PENALTY } from './rules.ts';

const book = (over: Partial<Book> = {}): Book => ({
  id: 'b', title: 'Homo faber', summary: 'About an engineer.', confidence: 'known', sources: ['dnb'], language: 'de', genreKey: 'fiction', pages: 200, ...over,
});
const profile = (over: Partial<TasteProfile> = {}): TasteProfile => ({ ...emptyProfile, ...over });
const score = (fit: number, b: Book, p: TasteProfile) => applyRules(fit, 'Model reason.', b, p, 'en');

describe('applyRules', () => {
  it('passes the model score through when no rule applies', () => {
    expect(score(86, book(), profile())).toEqual({ value: 86, reason: 'Model reason.' });
  });

  it('gives unknown books zero and tells the reader to check the blurb', () => {
    const s = score(90, book({ confidence: 'unknown' }), profile());
    expect(s).toMatchObject({ value: 0, cappedBy: 'unknown' });
    expect(s.reason).toContain('blurb');
  });

  it('does not score a catalogued book the model cannot describe', () => {
    const s = score(60, book({ confidence: 'uncertain', summary: undefined }), profile());
    expect(s).toMatchObject({ value: 0, cappedBy: 'unknown' });
    expect(s.reason).toContain('catalogue');
  });

  it('still scores unconfirmed books', () => {
    expect(score(70, book({ confidence: 'uncertain' }), profile()).value).toBe(70);
  });

  it('caps books in a language the reader does not read', () => {
    const s = score(95, book({ language: 'fr' }), profile({ languages: ['de', 'en'] }));
    expect(s).toMatchObject({ value: HARD_CAP, cappedBy: 'language' });
    expect(s.reason).toContain('FR');
  });

  it('does not raise a low score to the cap', () => {
    expect(score(5, book({ language: 'fr' }), profile({ languages: ['de'] })).value).toBe(5);
  });

  it('ignores language when the reader set none or the book has none', () => {
    expect(score(80, book({ language: 'fr' }), profile()).value).toBe(80);
    expect(score(80, book({ language: undefined }), profile({ languages: ['de'] })).value).toBe(80);
  });

  it('caps excluded genres', () => {
    const s = score(88, book({ genreKey: 'thriller' }), profile({ excludedGenres: ['thriller'] }));
    expect(s).toMatchObject({ value: HARD_CAP, cappedBy: 'excludedGenre' });
  });

  it('subtracts for books over the page limit and keeps the model reason', () => {
    const s = score(80, book({ pages: 450 }), profile({ maxPages: 400 }));
    expect(s.value).toBe(80 - OVER_LENGTH_PENALTY);
    expect(s.cappedBy).toBe('length');
    expect(s.reason).toBe('Longer than your limit (450 > 400 pages). Model reason.');
  });

  it('subtracts more when the book is far over the limit', () => {
    expect(score(80, book({ pages: 779 }), profile({ maxPages: 400 })).value).toBe(80 - FAR_OVER_LENGTH_PENALTY);
  });

  it('does not penalise a book exactly at the limit or with unknown length', () => {
    expect(score(80, book({ pages: 400 }), profile({ maxPages: 400 })).value).toBe(80);
    expect(score(80, book({ pages: undefined }), profile({ maxPages: 400 })).value).toBe(80);
  });

  it('lets the first hard rule win over the length penalty', () => {
    const s = score(90, book({ language: 'fr', pages: 900 }), profile({ languages: ['de'], maxPages: 300 }));
    expect(s.cappedBy).toBe('language');
  });

  it('clamps and rounds whatever the model returns', () => {
    expect(score(140, book(), profile()).value).toBe(100);
    expect(score(-5, book(), profile()).value).toBe(0);
    expect(score(72.6, book(), profile()).value).toBe(73);
    expect(score(Number.NaN, book(), profile()).value).toBe(0);
    expect(score(10, book({ pages: 900 }), profile({ maxPages: 300 })).value).toBe(0);
  });

  it('writes rule reasons in German when asked', () => {
    const s = applyRules(90, 'x', book({ genreKey: 'thriller' }), profile({ excludedGenres: ['thriller'] }), 'de');
    expect(s.reason).toContain('ausgeschlossen');
  });
});
