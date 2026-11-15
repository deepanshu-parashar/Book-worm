# Scan to Recommend

Photograph a public bookshelf (Bücherschrank) and see which books are worth pulling out, scored against your own taste. A personal PWA: React front end, a small API server that holds the keys.

## Status

| Milestone | State |
|---|---|
| M0 Skeleton with sample data | Works, checked in a phone-sized browser |
| M1 Single-book photo → lookup chain | Lookup chain works against the live DNB and Open Library. The Claude call is written but has not been run with a real key yet. |
| M2 Detail card with own-words summary | Works with sample data; real summaries depend on the Claude call |
| M3 Taste profile onboarding | Works |
| M4 "Take it?" score 0–100 | Rule layer works and is tested; the taste score comes from the Claude call |
| M5 Shelf photo → ranked list | Works with sample data; real spine reading depends on the Claude call |
| M6 My finds + feedback | Works; recent finds are sent with each scan |
| M7 Barcode | No barcode decoder. "Scan one book" reads the ISBN digits printed under a barcode or on the copyright page. |

## Setup

Needs Node 22 or newer.

```bash
npm install
cp .env.example .env   # optional: without a key the app runs on sample data
npm run dev
```

Open http://localhost:5173.

## Environment variables

| Name | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key. Empty means mock mode. |
| `CLAUDE_MODEL` | Model for the scan call, default `claude-opus-5-5`. |
| `CLAUDE_EFFORT` | `low` (default), `medium`, `high`, `xhigh` or `max`. Higher is slower and costs more. |
| `GOOGLE_BOOKS_API_KEY` | Recommended. Without a key Google Books uses a shared quota that is often exhausted, and the chain then skips it. |
| `MOCK` | `1` forces sample data even with a key. |
| `PORT` | API server port, default `8787`. |

Keys live in `.env` on the server side only. They are never sent to the browser and `.env` is git-ignored.

## Run it on your phone

1. Put phone and computer on the same Wi-Fi.
2. Run `npm run dev`. Vite prints a `Network:` address such as `http://192.168.x.x:5173`.
3. Open that address in the phone's browser. The scan buttons open the camera.

Taking photos works over plain HTTP on the local network. Installing the app to the home screen needs HTTPS, so that waits until it is deployed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API server and web app with reload |
| `npm test` | Tests for the lookup chain, scoring rules, result pipeline, API routes and ranking |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build of the web app into `dist/` |

## How a scan works

1. The browser downscales the photo and posts it with your taste profile and recent finds.
2. One Claude call reads the titles, says for each book whether it actually knows it, writes a short summary in its own words and gives a taste score.
3. Each book is checked against the catalogues in order: DNB, then Google Books, then Open Library. The first hit sets the facts; later ones only fill gaps. A catalogue that is down is skipped.
4. Confidence: **Confirmed** needs both the model and a catalogue. **Unconfirmed** means only one of them. **Unknown** means neither, and such a book gets no summary and no score.
5. Code applies your limits to the model's score (`server/scoring/rules.ts`):

| Rule | Effect |
|---|---|
| Unknown book, or in a catalogue but the model cannot describe it | Score 0, shown as "?" |
| Language you do not read | Capped at 20 |
| Genre you excluded | Capped at 20 |
| Over your page limit | Minus 20, or minus 35 when more than 1.5 times the limit |

On the shelf screen, "Worth a look" shows at most five books scoring 50 or more.

## Known limits

- A title search cannot tell which edition you are holding. The page count is then the median of the editions DNB lists, and the year comes from the model or Open Library. With an ISBN both are exact.
- Covers come from Open Library or Google Books and are often missing for old German books.
- The Claude prompt has not been tuned on real shelf photos yet.

## Privacy

- Photos are downscaled in the browser, sent once for the lookup, and never written to disk.
- Taste profile and finds are stored in this browser's localStorage only.
- No accounts, no analytics, no cookies.

## Layout

```
web/      React + Vite PWA (screens, i18n de/en, local storage)
server/   Hono API: scan routes, lookup chain, Claude calls, scoring rules
shared/   Types and the genre list used by both sides
```
