# Plant Tracker

React + Vite + Supabase app for tracking houseplants and their care schedules.

## Stack
- React 18 + Vite
- Supabase (DB, eu-west-1)
- TanStack Query for data fetching
- React Router for navigation

## Local setup
1. Copy `.env.local.example` → `.env.local` and fill in Supabase credentials
2. `npm install`
3. Run `supabase/schema.sql` in the Supabase SQL editor
4. `npm run dev`

## Supabase
- Project: plant-tracker
- All DB interaction goes through `src/lib/supabase.js`
- Run schema from `supabase/schema.sql` in the Supabase SQL editor

## Project structure
```
src/
  components/    # Reusable UI components (PlantCard, CareLogButton, etc.)
  pages/         # Route-level views (PlantList, PlantDetail, AddPlant)
  lib/           # Supabase client, helpers
  hooks/         # Custom React hooks (usePlants, useCareLog, useCareNeeds)
supabase/
  schema.sql     # Source of truth for DB schema
```

## Conventions
- One component per file
- Hooks for all Supabase queries (e.g. usePlants, useCareLog)
- Keep pages thin — logic in hooks, UI in components
- TanStack Query for all async state — no raw useEffect for fetching

## Schema overview
- `plants` — id, name, species, location, photo_url, notes, created_at
- `care_needs` — plant_id, water_every_days, light_level, soil_type, fertilize_every_days
- `care_log` — id, plant_id, action, logged_at, notes

## v1 features
- Plant list with cards showing name, location, light level, days until next watering
- Add/edit plant form
- Log a care action from the plant card (watered / fertilized / repotted / other)
- "Due for watering" highlight on overdue plants
