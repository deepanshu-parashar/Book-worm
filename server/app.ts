import { Hono } from 'hono';
import type { ApiError, BookScanResponse, ScanRequest, ScoredBook, ShelfScanResponse } from '../shared/types.ts';
import { AiUnavailable, claudeAnalyzer, type Analyzer } from './ai/claude.ts';
import { mockShelf } from './ai/fixtures.ts';
import type { ScanMode } from './ai/schema.ts';
import { config } from './config.ts';
import { lookupBook } from './lookup/index.ts';
import { buildResults, type LookupFn } from './pipeline.ts';
import { applyRules } from './scoring/rules.ts';
import { parseScanRequest } from './validate.ts';

export interface AppDeps {
  /** Null means mock mode: sample books, no model call, no catalogue lookups. */
  analyzer: Analyzer | null;
  lookup: LookupFn;
}

export const defaultDeps = (): AppDeps => ({
  analyzer: config.mock ? null : claudeAnalyzer(),
  lookup: lookupBook,
});

/** Sample data still runs through the real scoring rules, so the taste profile visibly matters. */
function mockResults(mode: ScanMode, req: ScanRequest): ScoredBook[] {
  const all = mockShelf(req.lang).map(({ book, score }) => ({
    book,
    score: applyRules(score.value, score.reason, book, req.profile, req.lang),
  }));
  return mode === 'book' ? all.slice(0, 1) : all;
}

export function createApp(deps: AppDeps = defaultDeps()) {
  const app = new Hono();
  const mock = deps.analyzer === null;

  async function scan(mode: ScanMode, req: ScanRequest): Promise<ScoredBook[]> {
    if (!deps.analyzer) return mockResults(mode, req);
    const models = await deps.analyzer.analyze(mode, req);
    return buildResults(mode === 'book' ? models.slice(0, 1) : models, req, deps.lookup);
  }

  app.get('/api/health', (c) => c.json({ ok: true, mock }));

  app.post('/api/scan/book', async (c) => {
    const req = parseScanRequest(await c.req.json().catch(() => null));
    if (typeof req === 'string') return c.json<ApiError>({ error: 'bad_request', message: req }, 400);
    const [result] = await scan('book', req);
    return c.json<BookScanResponse>({ result: result ?? null, mock });
  });

  app.post('/api/scan/shelf', async (c) => {
    const req = parseScanRequest(await c.req.json().catch(() => null));
    if (typeof req === 'string') return c.json<ApiError>({ error: 'bad_request', message: req }, 400);
    return c.json<ShelfScanResponse>({ results: await scan('shelf', req), mock });
  });

  app.onError((err, c) => {
    if (err instanceof AiUnavailable) {
      console.error('AI unavailable:', err.message);
      return c.json<ApiError>({ error: 'ai_unavailable', message: err.message }, 502);
    }
    console.error(err);
    return c.json<ApiError>({ error: 'server_error', message: 'Unexpected server error.' }, 500);
  });

  return app;
}
