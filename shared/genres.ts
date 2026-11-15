/** Fixed genre vocabulary shared by the taste profile, the model output and the scoring rules. */
export const GENRES = [
  'fiction', 'classics', 'crime', 'thriller', 'scifi', 'fantasy', 'historical', 'romance', 'humor',
  'biography', 'history', 'science', 'philosophy', 'travel', 'poetry', 'children', 'practical', 'other',
] as const;
export type GenreKey = (typeof GENRES)[number];

export const LANGUAGES = ['de', 'en', 'fr', 'es', 'it'] as const;
