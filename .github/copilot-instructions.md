# Copilot Instructions for AI Coding Agents

## Project Overview

- **Framework:** SvelteKit (see `svelte.config.js`, `vite.config.ts`)
- **UI:** Svelte components in `src/routes/` and `src/lib/`
- **Database:** Drizzle ORM (see `src/lib/server/db/` and Drizzle scripts in `package.json`)
- **Styling:** Tailwind CSS (see `tailwindcss` in `package.json`, `layout.css`)
- **Authentication:** Likely handled in `src/lib/server/auth.ts` and `src/routes/demo/lucia/`

## Key Directories & Files

- `src/routes/` — SvelteKit route handlers and pages
- `src/lib/` — Shared libraries, assets, and server logic
- `src/lib/server/db/` — Database schema and access (Drizzle ORM)
- `src/routes/demo/lucia/` — Example authentication flows
- `vite.config.ts` — Vite and test configuration
- `package.json` — Scripts, dependencies, and dev workflow

## Developer Workflows

- **Start Dev Server:** `npm run dev` (or `pnpm run dev`)
- **Build for Production:** `npm run build`
- **Preview Build:** `npm run preview`
- **Lint & Format:** `npm run lint` and `npm run format`
- **Type Check:** `npm run check`
- **Unit Tests:** `npm run test` (uses Vitest)
- **Database Migrations:**
  - `npm run db:push` — Push schema
  - `npm run db:generate` — Generate types
  - `npm run db:migrate` — Run migrations
  - `npm run db:studio` — Open Drizzle Studio

## Project Conventions

- **TypeScript:** All logic and Svelte files use TypeScript (`lang="ts"` in Svelte)
- **Prettier & ESLint:** Enforced via config files and scripts
- **Tailwind CSS:** Used for all styling; see `layout.css` and Prettier plugin config
- **Environment Variables:** Use `.env` (see `.env.example` for required vars)
- **Testing:**
  - Client-side Svelte tests: `src/**/*.svelte.{test,spec}.{js,ts}`
  - Server-side tests: `src/**/*.{test,spec}.{js,ts}` (excluding Svelte test files)
- **Imports:** Prefer `$lib/` and `$app/` aliases for internal modules

## Integration & Patterns

- **Database:** All DB access via Drizzle ORM in `src/lib/server/db/`
- **Authentication:** Example flows in `src/routes/demo/lucia/`
- **Assets:** Place static files in `static/` and shared assets in `src/lib/assets/`

## Examples

- See `src/routes/demo/` for feature demos and patterns
- See `src/lib/server/db/schema.ts` for DB schema conventions

---

**For more details, see `README.md` and referenced config/scripts.**
