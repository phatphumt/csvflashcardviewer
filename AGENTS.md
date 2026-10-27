# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

Flashcards is an offline-first CSV flashcard app. It has no backend, no account system, no analytics, and no default deck. A visitor imports a CSV; everything else runs in the browser.

- Production: https://flashcards-app-gules-xi.vercel.app
- Repository: https://github.com/phatphumt/csvflashcardviewer
- Stack: Vite 8, React 19, TypeScript (strict), Tailwind CSS v4, Motion, Radix primitives, Sonner, PapaParse, KaTeX.
- Fonts: self-hosted Bricolage Grotesque (questions/headings) and Inter (UI/answers).

Do not add a server, database, account flow, or network requests for deck data unless explicitly asked. Decks belong in `localStorage`.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # tsc --noEmit + vite build; must pass before finishing
npm run preview   # serve dist/ locally
npx vercel --prod # deploy to Vercel production (requires auth)
```

On this Windows machine, npm may need to be invoked through `cmd` because PowerShell script execution is disabled:

```powershell
cmd /c "npm run build"
```

## Non-negotiable product constraints

- **No bundled/default deck.** The app boots to an empty state; CSV import is the only card source.
- **Import paths:** file picker, drag-and-drop anywhere, and the `I` shortcut.
- **Up to 10 decks**, with the oldest imported deck evicted when the cap or byte budget is exceeded. Keep the undo affordance in the eviction toast.
- **Per-deck progress** must survive refreshes: order, current index, and ratings.
- **No shadcn or UI kit.** Use the local components and raw Radix primitives (dialog, popover, select).
- **No font switcher** in the UI. Keep one fixed pairing.
- **No network font requests.** Import fonts from Fontsource in `src/main.tsx`.
- **Reduced motion matters.** Gate transforms/animations with `prefers-reduced-motion` or `useReducedMotion`.
- **Minimal Paper aesthetic.** Light canvas `#FAFAF9`, ink `#18181B`, accent `#0F766E`; hairline borders and restrained shadows. Dark mode uses its own tokens.

## Architecture

| Path | Responsibility |
|---|---|
| `src/App.tsx` | App state, CSV import flow, study loop, keyboard shortcuts, persistence, toasts |
| `src/components/Card.tsx` | 3D flip, pointer tilt, swipe, rating buttons, long-question layout |
| `src/components/DeckSwitcher.tsx` | Deck menu, active deck selection, removal, eviction/undo |
| `src/components/ColumnMapper.tsx` | Dialog for ambiguous CSV files (3+ columns / no usable header) |
| `src/components/ImportZone.tsx` | Drag-and-drop overlay and file-drop hook |
| `src/components/EmptyState.tsx` | First-run / no-deck state |
| `src/components/Summary.tsx` | End-of-deck summary and review-missed flow |
| `src/components/RichText.tsx` | Inline `$...$`, display `$$...$$`, and plain-text rendering with KaTeX |
| `src/components/Button.tsx`, `ThemeToggle.tsx`, `icons.tsx` | Local UI primitives/icons |
| `src/lib/csv.ts` | PapaParse wrapper, delimiter/BOM handling, header detection, column aliases, formula prefix, card construction |
| `src/lib/decks.ts` | Data types, storage key/version, deck limits, persistence, shuffle, name cleanup |
| `src/lib/cn.ts` | Class-name helper |
| `src/styles.css` | Design tokens, Tailwind theme mapping, fonts, Sonner overrides, reduced-motion rules |
| `src/main.tsx` | Font imports, KaTeX CSS, React mount |

The app is a single page; there is no router. `vite.config.ts` sets `base: "./"`.

## Data and limits

Storage key: `flashcards.v2` (`Persisted.version = 2`).

```ts
Flashcard = { id, front, back, isFormula }
Deck = { id, name, cards, importedAt, bytes, transient? }
DeckProgress = { order: string[], index: number, ratings: Record<string, "again" | "got"> }
```

- Max decks: **10** (`MAX_DECKS`)
- Max total deck bytes: **3.5 MB** (`MAX_TOTAL_BYTES`)
- Decks over **1.5 MB** are in-memory only (`transient`), not persisted
- Max imported file: **5 MB**
- Max CSV rows: **5,000** (`MAX_ROWS`)
- Oldest decks are evicted first; the newly imported deck is never the eviction victim
- `saveState` filters transient decks and repairs a stale `activeDeckId`

## CSV behaviour

- PapaParse auto-detects `,`, `;`, tab, and `|`; BOM is stripped.
- Header aliases:
  - front: `front`, `question`, `term`, `prompt`, `word`, `q`, `ask`
  - back: `back`, `answer`, `definition`, `meaning`, `a`, `translation`, `response`
- Two columns without a header import immediately as front/back.
- Header rows match by alias; otherwise a column-mapping dialog is required.
- A leading `Formula:` / `formula:` is stripped from the front and shown as a `FORMULA` chip.
- Empty fronts/backs are skipped. Empty files, one-column files, header-only files, oversized files, and over-limit row counts are rejected with plain-language messages.
- LaTeX is rendered with KaTeX; keep `RichText` as the single rendering path.

## Styling and type

- Tailwind v4 theme mapping lives in `@theme inline` in `src/styles.css`:
  - `--font-heading: var(--font-display)` → Bricolage Grotesque
  - `--font-sans: var(--font-ui)` → Inter
  - colours: `canvas`, `surface`, `ink`, `muted`, `line`, `accent`, `accent-soft`
- Use `font-heading` for questions, deck title, and section headings; body/UI text inherits Inter.
- Keep CSS resets and base element styles inside `@layer base`. Unlayered CSS outranks Tailwind utilities and has previously broken button contrast and `text-canvas`.
- Bricolage imports `standard.css` (includes the optical-size axis); Inter imports `wght.css`. Do not switch Bricolage to the weight-only file without checking question rendering.
- Exact family names are `"Bricolage Grotesque Variable"` and `"Inter Variable"`.
- Keep Thai-capable fallbacks (`Leelawadee UI`, `Noto Sans Thai`) in the stacks.
- Sonner injects styles at runtime; the local `[data-sonner-toast]` overrides are intentional so toasts match `--surface`/`--ink`/`--line` in both themes.
- All-caps micro-labels (`ANSWER`, `FORMULA`, `GOT IT`) intentionally stay in Inter.

## Interaction and accessibility

Keyboard shortcuts:

| Key | Action |
|---|---|
| `Space` / `Enter` | Flip |
| `←` / `→` | Previous / next |
| `1` | Again (while flipped) |
| `2` | Got it (while flipped) |
| `S` | Shuffle |
| `R` | Reset (press twice) |
| `I` | Import CSV |
| `D` | Deck menu |
| `T` | Theme: light → dark → system |

Touch: swipe left/right to move, tap to flip. Desktop: subtle pointer tilt. Preserve `aria-label`s, focus-visible rings, and keyboard access when changing card or dialog markup.

## Verification checklist

Before calling a UI change done:

1. `npm run build` passes.
2. Import a 2-column CSV, a header CSV, and a 3-column CSV that triggers the mapper.
3. Confirm a 1-column / empty / oversized file is rejected.
4. Check a long question at desktop and at 390 px for clipping or overflow.
5. Check light and dark mode, including toast contrast.
6. Check Thai text and KaTeX/formula cards.
7. Flip, rate, shuffle, reset, import, deck switch, refresh persistence, and deck eviction/undo.
8. Check the browser console for errors.
9. If fonts changed, verify computed family/weight and actual glyph rendering, not just `document.fonts.check`.

## Deployment and repository

- Vercel project: `phatphumts-projects/flashcards-app`
- Production alias: https://flashcards-app-gules-xi.vercel.app
- The raw deployment URL is SSO-protected; use the alias when sharing.
- Git remote: `https://github.com/phatphumt/csvflashcardviewer.git` (`main`)
- `node_modules`, `dist`, and `.vercel` are ignored. Do not commit build output or local Vercel state.
- GitHub Pages still serves the old single-file version. The Vite app needs a build workflow before Pages can serve it; Vercel is the canonical deployment.

## Gotchas

- The app intentionally shows an empty state until a CSV is imported. A blank screen after deleting a test CSV is not necessarily a font/DOM bug.
- A Vite build warning about a large JS chunk (~800 kB) is expected from KaTeX + Motion + Radix.
- Do not reintroduce `font-serif`; use `font-heading`.
- If `font-heading` computes as Inter, check that `--font-display` is defined and that you are testing a fresh build/server, not the empty state.
- Keep changes scoped. Update `README.md` and this file when product behaviour, commands, or architecture change.
