import { z } from 'zod';
import { GENRES } from '../../shared/genres.ts';

export const ModelBookSchema = z.object({
  title: z.string().describe('Title as printed on the book.'),
  author: z.string().nullable().describe('Author as printed, or null when not visible and not certain.'),
  isbn: z.string().nullable().describe('ISBN only if its digits are printed and readable in the photo, else null.'),
  language: z.string().nullable().describe('ISO 639-1 code of the language this copy is written in.'),
  firstPublished: z.number().nullable().describe('Year the work was first published, if you know it.'),
  knowsBook: z.boolean().describe('True only if you know the content of this specific book from your own knowledge.'),
  summary: z.string().nullable().describe('2-3 sentences in your own words. Null when knowsBook is false.'),
  genreKey: z.enum(GENRES).nullable(),
  genreLabel: z.string().nullable().describe("Short genre label in the reader's language."),
  difficulty: z.enum(['easy', 'medium', 'demanding']).nullable(),
  fit: z.number().describe('0-100: how well the book fits the reader.'),
  reason: z.string().describe("One sentence in the reader's language explaining the fit."),
});
export const AnalysisSchema = z.object({ books: z.array(ModelBookSchema) });

export type ModelBook = z.infer<typeof ModelBookSchema>;
export type ScanMode = 'book' | 'shelf';
