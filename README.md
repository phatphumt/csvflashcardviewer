# Flashcards

A minimal, offline-first flashcard app. Import any CSV — no account, no server, no default deck.

## Run

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

`npm run build` writes a static bundle to `dist/`. It uses relative asset paths, so it can be served from any folder — but use `npm run preview` rather than double-clicking `index.html`, because Chrome blocks KaTeX font files over `file://`.

## Importing a CSV

Click the upload icon, press `I`, or drag a file anywhere on the window.

| Shape | Behaviour |
|---|---|
| 2 columns, no header | Column 1 = front, column 2 = back — imports instantly |
| Header row (`question,answer`, `term,definition`, `front,back`…) | Columns matched by name |
| 3+ columns, no usable header | A "Match the columns" dialog lets you pick front and back |
| 1 column / empty / > 5 MB / > 5,000 rows | Rejected with a plain-language message |

- Delimiters `,` `;` tab and `|` are auto-detected, BOM is stripped
- LaTeX in either field is rendered with KaTeX: `$Ca^{2+}$`, `$\frac{\Delta P}{R}$`, `$$…$$`
- A leading `Formula:` is stripped and shown as a `FORMULA` chip

Decks are kept in the deck menu (top-left). Up to **10 decks**, ~3.5 MB total; the oldest imported deck is evicted first, with a toast. A single deck over 1.5 MB still loads but stays in memory only.

## Shortcuts

| Key | Action |
|---|---|
| `Space` / `Enter` | Flip the card |
| `←` `→` | Previous / next |
| `1` | Again (while flipped) |
| `2` | Got it (while flipped) |
| `S` | Shuffle |
| `R` | Reset deck (press twice) |
| `I` | Import CSV |
| `D` | Deck menu |
| `T` | Theme: light → dark → system |

On touch devices: swipe left/right to move, tap to flip.

## Stack

Vite · React · TypeScript · Tailwind CSS v4 · Motion · Radix primitives (popover, dialog, select) · Sonner · PapaParse · KaTeX

Type: Bricolage Grotesque for questions and headings, Inter for UI and answers — both self-hosted via Fontsource, with Thai-capable system fallbacks. No network font requests.

No UI kit — all styling is local, with tokens in `src/styles.css`.
