import { Hono } from 'hono';
import type { ApiError, BookScanResponse, ShelfScanResponse } from '../shared/types.ts';
import { config } from './config.ts';
import { mockBook, mockShelf } from './ai/fixtures.ts';
import { parseScanRequest } from './validate.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createApp() {
  const app = new Hono();

  app.get('/api/health', (c) => c.json({ ok: true, mock: config.mock }));

  app.post('/api/scan/book', async (c) => {
    const req = parseScanRequest(await c.req.json().catch(() => null));
    if (typeof req === 'string') return c.json<ApiError>({ error: 'bad_request', message: req }, 400);
    await sleep(600);
    return c.json<BookScanResponse>({ result: mockBook(req.lang), mock: true });
  });

  app.post('/api/scan/shelf', async (c) => {
    const req = parseScanRequest(await c.req.json().catch(() => null));
    if (typeof req === 'string') return c.json<ApiError>({ error: 'bad_request', message: req }, 400);
    await sleep(900);
    return c.json<ShelfScanResponse>({ results: mockShelf(req.lang), mock: true });
  });

  app.onError((err, c) => {
    console.error(err);
    return c.json<ApiError>({ error: 'server_error', message: 'Unexpected server error.' }, 500);
  });

  return app;
}
