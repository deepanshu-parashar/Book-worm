export interface LookupQuery {
  isbn?: string;
  title?: string;
  author?: string;
  /** ISO 639-1 code the model read off the book; used to prefer the right edition. */
  language?: string;
}

export type SourceName = 'dnb' | 'googleBooks' | 'openLibrary';

/** Hard facts from one catalogue. Never contains publisher blurb text. */
export interface CatalogueHit {
  source: SourceName;
  title: string;
  author?: string;
  year?: number;
  pages?: number;
  language?: string;
  isbn?: string;
  coverUrl?: string;
}

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

export interface Provider {
  name: SourceName;
  /** Resolves to null for "no match". Rejects on network or server failure. */
  lookup(query: LookupQuery, fetchFn: FetchLike): Promise<CatalogueHit | null>;
}
