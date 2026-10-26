export type Rating = "again" | "got";

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  isFormula: boolean;
};

export type Deck = {
  id: string;
  name: string;
  cards: Flashcard[];
  importedAt: number;
  bytes: number;
  transient?: boolean;
};

export type DeckProgress = {
  order: string[];
  index: number;
  ratings: Record<string, Rating>;
};

export type Theme = "light" | "dark" | "system";

export type Persisted = {
  version: 2;
  decks: Deck[];
  activeDeckId: string | null;
  progress: Record<string, DeckProgress>;
  theme: Theme;
};

export const STORAGE_KEY = "flashcards.v2";
export const MAX_DECKS = 10;
export const MAX_TOTAL_BYTES = 3_500_000;
export const TRANSIENT_BYTES = 1_500_000;

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function emptyState(): Persisted {
  return {
    version: 2,
    decks: [],
    activeDeckId: null,
    progress: {},
    theme: "system",
  };
}

export function makeProgress(deck: Deck): DeckProgress {
  return { order: deck.cards.map((c) => c.id), index: 0, ratings: {} };
}

function isCard(value: unknown): value is Flashcard {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    typeof c.front === "string" &&
    typeof c.back === "string"
  );
}

function isDeck(value: unknown): value is Deck {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.name === "string" &&
    Array.isArray(d.cards) &&
    d.cards.every(isCard)
  );
}

export function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<Persisted> | null;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.decks)) {
      return emptyState();
    }

    const decks = parsed.decks.filter(isDeck).map((deck) => ({
      ...deck,
      cards: deck.cards.map((c) => ({ ...c, isFormula: !!c.isFormula })),
      importedAt: Number(deck.importedAt) || Date.now(),
      bytes: Number(deck.bytes) || JSON.stringify(deck.cards).length,
    }));

    const progress: Record<string, DeckProgress> = {};
    for (const deck of decks) {
      const stored = parsed.progress?.[deck.id];
      const validIds = new Set(deck.cards.map((c) => c.id));
      const seen = new Set<string>();
      const order: string[] = [];
      if (stored && Array.isArray(stored.order)) {
        for (const id of stored.order) {
          if (typeof id === "string" && validIds.has(id) && !seen.has(id)) {
            seen.add(id);
            order.push(id);
          }
        }
      }
      const finalOrder = order.length > 0 ? order : deck.cards.map((c) => c.id);
      progress[deck.id] = {
        order: finalOrder,
        index: Math.max(
          0,
          Math.min(Number(stored?.index) || 0, finalOrder.length),
        ),
        ratings:
          stored && typeof stored.ratings === "object" && stored.ratings
            ? Object.fromEntries(
                Object.entries(stored.ratings).filter(
                  ([id, r]) =>
                    (r === "again" || r === "got") &&
                    deck.cards.some((c) => c.id === id),
                ),
              )
            : {},
      };
    }

    const activeDeckId =
      parsed.activeDeckId && decks.some((d) => d.id === parsed.activeDeckId)
        ? parsed.activeDeckId
        : (decks[0]?.id ?? null);

    const theme: Theme =
      parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
        ? parsed.theme
        : "system";

    return { version: 2, decks, activeDeckId, progress, theme };
  } catch {
    return emptyState();
  }
}

export function saveState(state: Persisted): boolean {
  const persistable: Persisted = {
    ...state,
    decks: state.decks.filter((d) => !d.transient),
    activeDeckId: state.decks.some((d) => d.id === state.activeDeckId && !d.transient)
      ? state.activeDeckId
      : (state.decks.find((d) => !d.transient)?.id ?? null),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    return true;
  } catch {
    return false;
  }
}

export type ImportOutcome = {
  state: Persisted;
  evicted: string[];
};

export function addDeck(prev: Persisted, deck: Deck): ImportOutcome {
  const cards = deck.cards;
  let decks = [deck, ...prev.decks];
  const progress: Record<string, DeckProgress> = {
    ...prev.progress,
    [deck.id]: makeProgress(deck),
  };
  const evicted: string[] = [];

  const size = () => decks.reduce((sum, d) => sum + (d.bytes || 0), 0);
  while (
    decks.length > 1 &&
    (decks.length > MAX_DECKS || size() > MAX_TOTAL_BYTES)
  ) {
    const victim = decks
      .filter((d) => d.id !== deck.id)
      .sort((a, b) => a.importedAt - b.importedAt)[0];
    if (!victim) break;
    decks = decks.filter((d) => d.id !== victim.id);
    delete progress[victim.id];
    evicted.push(victim.name);
  }

  return {
    state: { ...prev, decks, progress, activeDeckId: deck.id },
    evicted,
  };
}

export function removeDeck(prev: Persisted, id: string): Persisted {
  const decks = prev.decks.filter((d) => d.id !== id);
  const progress = { ...prev.progress };
  delete progress[id];
  const activeDeckId =
    prev.activeDeckId === id ? (decks[0]?.id ?? null) : prev.activeDeckId;
  return { ...prev, decks, progress, activeDeckId };
}

export function newDeck(name: string, cards: Flashcard[]): Deck {
  const bytes = JSON.stringify(cards).length;
  return {
    id: uid(),
    name,
    cards,
    importedAt: Date.now(),
    bytes,
    transient: bytes > TRANSIENT_BYTES,
  };
}

export function shuffleIds(ids: string[]): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function deckNameFromFile(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const name = base || "Untitled deck";
  return (name.charAt(0).toUpperCase() + name.slice(1)).slice(0, 64);
}
