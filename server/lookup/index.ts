import { config } from '../config.ts';
import { lookupChain, type ChainOptions, type LookupResult } from './chain.ts';
import { dnb } from './dnb.ts';
import { googleBooks } from './googleBooks.ts';
import { openLibrary } from './openLibrary.ts';
import type { LookupQuery, Provider } from './types.ts';

/** Order matters: DNB is the strongest catalogue for old German books. */
export const defaultProviders = (): Provider[] => [dnb, googleBooks(config.googleBooksKey), openLibrary];

export const lookupBook = (q: LookupQuery, opts?: ChainOptions): Promise<LookupResult> =>
  lookupChain(q, defaultProviders(), opts);
