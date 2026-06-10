# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, localhost:5173)
npm run build     # Production build — run before committing to verify no type/import errors
npm run lint      # ESLint
npm run preview   # Preview production build locally
```

No test suite exists. Verify changes with `npm run build` and manual testing via `npm run dev`.

## Stack

- **React 19 + Vite** — SPA, no SSR
- **Supabase** — Postgres DB + Storage; project `plant-tracker` (eu-west-1, id `ckfqelmvdoaukptajcsc`)
- **TanStack Query v5** — all async state; no raw `useEffect` for fetching
- **React Router v7** — client-side routing; `vercel.json` rewrites all paths to `index.html`
- **Vercel** — deploys from `main` branch automatically; serverless functions in `api/`

## Environment variables

```
VITE_SUPABASE_URL        # Baked into the JS bundle at build time
VITE_SUPABASE_ANON_KEY   # Baked into the JS bundle at build time
ANTHROPIC_API_KEY        # Runtime only — used by api/ serverless functions, never the frontend
```

`src/lib/supabase.js` exports a `subaseMisconfigured` flag (note: typo is intentional, don't change) and a nullable `supabase` client. `src/App.jsx` shows a banner instead of crashing when misconfigured.

## Architecture

### Data layer
All Supabase reads/writes go through hooks in `src/hooks/`. Pages call hooks; hooks call Supabase directly. No service layer.

- **`usePlants` / `usePlant`** — query `plant_overview` view (not the `plants` table directly), which joins `care_needs` and aggregates last-action timestamps from `care_log`
- **`usePlantMutations`** — add/update/delete on the `plants` table
- **`useUpsertCareNeeds`** — upsert on `care_needs` (1:1 with plants)
- **`useCareLog` / `useLogCareAction`** — care event log; insert invalidates `['plants']` and `['care_log', plantId]`
- **`usePlantLookup`** — calls `/api/lookup-plant` (Vercel serverless → Claude Haiku); returns structured suggestion
- **`useUploadPhoto`** — uploads to Supabase Storage bucket `plant-photos` (public, 5 MB limit)

### Shared helper
`src/lib/care.js` exports `daysUntil(lastAt, everyDays)` — used by `PlantCard`, `PlantDetail`, and `PlantList` to compute watering/repot countdowns. Do not duplicate this logic.

### Serverless functions (`api/`)
Plain Vercel Node.js handlers — `export default function handler(req, res)`. They use `process.env` (runtime), not `import.meta.env` (build-time).

- **`lookup-plant.js`** — calls Claude Haiku with a structured prompt returning all care fields + `common_name_da`; fetches a Wikipedia photo
- **`backfill-danish-names.js`** — one-shot endpoint; calls Claude to fill `common_name_da` for existing plants that have `null`

### Database
`supabase/schema.sql` is the source of truth. The `plant_overview` view is what the frontend queries — it must be updated whenever columns are added to `plants` or `care_needs`.

**`plants` table columns**: `id, name, species, common_name_da, location, photo_url, notes, created_at`

**`care_needs` columns**: `plant_id, water_every_days, light_level, soil_type, fertilize_every_days, light_ppfd, light_dli, humidity_min, humidity_max, temp_min, temp_max, repot_every_days`

**`care_log` columns**: `id, plant_id, action (enum), logged_at, notes`

RLS is enabled with open public policies — no auth yet.

### Styling
CSS Modules (`.module.css` per component/page). Global theme vars in `src/index.css`:
- `--bg: #000`, `--accent: #2d8a4e`, `--text: #86a892`, `--text-h: #d4edda`, `--border: #1a3325`
- Always dark — no light/dark media query

### Event handling in PlantCard
`PlantCard` is a `<Link>` wrapping the whole card. The `CareLogButton` sits inside a footer div with `onClick={(e) => e.preventDefault()}` to block navigation. The `CareLogButton` wrapper uses `e.stopPropagation()` so click events don't reach that footer handler (which would cancel form submissions). Action buttons inside the dropdown explicitly call `e.preventDefault()` themselves.
