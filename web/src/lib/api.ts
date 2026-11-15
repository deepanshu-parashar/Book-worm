import type { BookScanResponse, ScanRequest, ShelfScanResponse } from '../../../shared/types.ts';

export type ApiFailure = 'network' | 'server';
export class ApiFailed extends Error {
  constructor(public kind: ApiFailure) { super(kind); }
}

async function post<T>(path: string, body: ScanRequest): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new ApiFailed('network');
  }
  if (!res.ok) throw new ApiFailed('server');
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiFailed('server');
  }
}

export const scanBook = (req: ScanRequest) => post<BookScanResponse>('/api/scan/book', req);
export const scanShelf = (req: ScanRequest) => post<ShelfScanResponse>('/api/scan/shelf', req);

export async function health(): Promise<{ mock: boolean } | null> {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
