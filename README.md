# Scan to Recommend

Photograph a public bookshelf (Bücherschrank) and see which books are worth pulling out, scored against your own taste. A personal PWA: React front end, a small API server that holds the keys.

## Status

| Milestone | State |
|---|---|
| M0 Skeleton with mock data | done |
| M1 Single-book photo → lookup chain | open |
| M2 Detail card with own-words summary | open |
| M3 Taste profile onboarding | open |
| M4 "Take it?" score 0–100 | open |
| M5 Shelf photo → ranked list | open |
| M6 My finds + feedback | open |
| M7 Barcode from a photo | open |

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
| `GOOGLE_BOOKS_API_KEY` | Optional, raises the Google Books rate limit. |
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
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Production build of the web app into `dist/` |

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
