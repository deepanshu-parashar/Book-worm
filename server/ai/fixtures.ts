import type { Lang, ScoredBook } from '../../shared/types.ts';

type Bi = Record<Lang, string>;
interface Fixture {
  book: Omit<ScoredBook['book'], 'summary' | 'genre'> & { summary?: Bi; genre?: Bi };
  value: number;
  reason: Bi;
}

const fixtures: Fixture[] = [
  {
    book: {
      id: 'mock-homo-faber', title: 'Homo faber', author: 'Max Frisch', year: 1957, pages: 203,
      language: 'de', difficulty: 'medium', confidence: 'known', sources: ['mock'],
      genreKey: 'fiction', genre: { de: 'Roman', en: 'Literary fiction' },
      summary: {
        de: 'Ein rational denkender Ingenieur gerät durch eine Kette von Zufällen in eine Beziehung, die sein technisches Weltbild erschüttert. Ein kurzer, dichter Roman über Schuld und Schicksal.',
        en: 'A coolly rational engineer is drawn by a chain of coincidences into a relationship that shatters his technical view of the world. A short, dense novel about guilt and fate.',
      },
    },
    value: 86,
    reason: { de: 'Kurzer Klassiker, passt zu deiner Vorliebe für Romane.', en: 'Short classic that fits your liking for literary fiction.' },
  },
  {
    book: {
      id: 'mock-momo', title: 'Momo', author: 'Michael Ende', year: 1973, pages: 269,
      language: 'de', difficulty: 'easy', confidence: 'known', sources: ['mock'],
      genreKey: 'fantasy', genre: { de: 'Märchenroman', en: 'Fantasy' },
      summary: {
        de: 'Ein Mädchen, das besonders gut zuhören kann, stellt sich grauen Herren entgegen, die den Menschen ihre Zeit stehlen. Leicht zu lesen, mit ernstem Kern.',
        en: 'A girl with a gift for listening takes on grey men who steal people\'s time. Easy to read, with a serious core.',
      },
    },
    value: 74,
    reason: { de: 'Leicht und kurz, aber Fantasy steht nicht bei deinen Lieblingsgenres.', en: 'Light and short, but fantasy is not among your favourite genres.' },
  },
  {
    book: {
      id: 'mock-blechtrommel', title: 'Die Blechtrommel', author: 'Günter Grass', year: 1959, pages: 779,
      language: 'de', difficulty: 'demanding', confidence: 'known', sources: ['mock'],
      genreKey: 'fiction', genre: { de: 'Roman', en: 'Literary fiction' },
      summary: {
        de: 'Oskar Matzerath beschließt mit drei Jahren, nicht mehr zu wachsen, und erzählt trommelnd die deutsche Geschichte vor, während und nach dem Krieg. Sprachgewaltig und lang.',
        en: 'Oskar Matzerath decides at three to stop growing and drums his way through German history before, during and after the war. Linguistically dense and long.',
      },
    },
    value: 48,
    reason: { de: 'Passt thematisch, liegt aber über deiner Seitengrenze.', en: 'Fits thematically but is over your page limit.' },
  },
  {
    book: {
      id: 'mock-schwarm', title: 'Der Schwarm', author: 'Frank Schätzing', year: 2004, pages: 987,
      language: 'de', difficulty: 'medium', confidence: 'uncertain', sources: [],
      genreKey: 'thriller', genre: { de: 'Thriller', en: 'Thriller' },
      summary: {
        de: 'Weltweit häufen sich rätselhafte Angriffe aus dem Meer, und ein Forscherteam sucht nach der Ursache. Umfangreicher Wissenschaftsthriller.',
        en: 'Mysterious attacks from the sea multiply around the world while a team of scientists looks for the cause. A very long science thriller.',
      },
    },
    value: 35,
    reason: { de: 'Sehr lang; Thriller hast du nicht als Vorliebe genannt.', en: 'Very long; you did not name thrillers as a preference.' },
  },
  {
    book: {
      id: 'mock-heimatkalender', title: 'Heimatkalender 1962', confidence: 'unknown', sources: [],
    },
    value: 0,
    reason: { de: 'Unbekanntes Buch – lies selbst den Klappentext.', en: 'Unknown book – read the blurb yourself.' },
  },
];

export function mockShelf(lang: Lang): ScoredBook[] {
  return fixtures.map((f) => ({
    book: { ...f.book, genre: f.book.genre?.[lang], summary: f.book.summary?.[lang] },
    score: { value: f.value, reason: f.reason[lang] },
  }));
}

export function mockBook(lang: Lang): ScoredBook {
  return mockShelf(lang)[0];
}
