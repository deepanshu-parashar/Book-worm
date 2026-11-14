import type { Book, Lang, Score, TasteProfile } from '../../shared/types.ts';

/** A book that breaks a hard "never" rule cannot score above this. */
export const HARD_CAP = 20;
export const OVER_LENGTH_PENALTY = 20;
export const FAR_OVER_LENGTH_PENALTY = 35;

const TEXT = {
  unknown: { de: 'Unbekanntes Buch – lies selbst den Klappentext.', en: 'Unknown book – read the blurb yourself.' },
  undescribed: {
    de: 'Im Katalog gefunden, aber ich kenne den Inhalt nicht – lies selbst den Klappentext.',
    en: 'Found in the catalogue, but I do not know its content – read the blurb yourself.',
  },
  language: { de: 'Nicht in einer Sprache, die du liest ({x}).', en: 'Not in a language you read ({x}).' },
  genre: { de: 'Gehört zu einem Genre, das du ausgeschlossen hast.', en: 'Belongs to a genre you excluded.' },
  length: { de: 'Länger als deine Grenze ({x} > {y} Seiten).', en: 'Longer than your limit ({x} > {y} pages).' },
} satisfies Record<string, Record<Lang, string>>;

const fill = (s: string, x?: string | number, y?: string | number) => s.replace('{x}', String(x)).replace('{y}', String(y));
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

/**
 * Turns the model's taste judgement into the final score. The model judges taste only;
 * everything the reader stated as a limit is enforced here, so the result is explainable
 * and cannot be talked around by a persuasive summary.
 *
 * Order: unknown or undescribed book → language → excluded genre → length. The first hard rule wins.
 */
export function applyRules(modelFit: number, modelReason: string, book: Book, profile: TasteProfile, lang: Lang): Score {
  if (book.confidence === 'unknown') {
    return { value: 0, reason: TEXT.unknown[lang], cappedBy: 'unknown' };
  }
  // In a catalogue, but the model cannot describe it: there is nothing to base a score on.
  if (book.confidence === 'uncertain' && !book.summary) {
    return { value: 0, reason: TEXT.undescribed[lang], cappedBy: 'unknown' };
  }
  const fit = clamp(modelFit);

  if (book.language && profile.languages.length > 0 && !profile.languages.includes(book.language)) {
    return { value: Math.min(fit, HARD_CAP), reason: fill(TEXT.language[lang], book.language.toUpperCase()), cappedBy: 'language' };
  }
  if (book.genreKey && profile.excludedGenres.includes(book.genreKey)) {
    return { value: Math.min(fit, HARD_CAP), reason: TEXT.genre[lang], cappedBy: 'excludedGenre' };
  }
  if (profile.maxPages && book.pages && book.pages > profile.maxPages) {
    const penalty = book.pages > profile.maxPages * 1.5 ? FAR_OVER_LENGTH_PENALTY : OVER_LENGTH_PENALTY;
    return {
      value: clamp(fit - penalty),
      reason: `${fill(TEXT.length[lang], book.pages, profile.maxPages)} ${modelReason}`.trim(),
      cappedBy: 'length',
    };
  }
  return { value: fit, reason: modelReason };
}
