import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import { Toaster, toast } from "sonner";

import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { ColumnMapper } from "./components/ColumnMapper";
import { DeckSwitcher } from "./components/DeckSwitcher";
import { EmptyState } from "./components/EmptyState";
import { DropOverlay, useFileDrop } from "./components/ImportZone";
import { Summary } from "./components/Summary";
import { ThemeToggle } from "./components/ThemeToggle";
import {
  IconChevronLeft,
  IconChevronRight,
  IconShuffle,
  IconUpload,
} from "./components/icons";

import { parseCsv, toCards, type CsvData, type Mapping } from "./lib/csv";
import {
  addDeck,
  deckNameFromFile,
  loadState,
  makeProgress,
  newDeck,
  removeDeck,
  saveState,
  shuffleIds,
  type Deck,
  type DeckProgress,
  type Flashcard,
  type Persisted,
  type Rating,
  type Theme,
} from "./lib/decks";

type Anim = { dir: number; mode: "nav" | "rate" };

const variants: Variants = {
  enter: (anim: Anim) =>
    anim.mode === "rate"
      ? { opacity: 0, scale: 0.96 }
      : { x: anim.dir * 56, opacity: 0, scale: 0.97 },
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (anim: Anim) =>
    anim.mode === "rate"
      ? { opacity: 0, scale: 0.96, x: anim.dir * 36 }
      : { x: anim.dir * -56, opacity: 0, scale: 0.97 },
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line px-1 py-0.5 text-[10px] text-muted">
      {children}
    </kbd>
  );
}

export default function App() {
  const [state, setState] = useState<Persisted>(loadState);
  const [flipped, setFlipped] = useState(false);
  const [anim, setAnim] = useState<Anim>({ dir: 1, mode: "nav" });
  const [pending, setPending] = useState<{ data: CsvData; name: string } | null>(
    null,
  );
  const [deckOpen, setDeckOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const resetTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveFailed = useRef(false);
  const reduce = useReducedMotion();

  const deck = state.decks.find((item) => item.id === state.activeDeckId) ?? null;
  const prog = deck ? state.progress[deck.id] : null;
  const total = deck?.cards.length ?? 0;
  const order = prog?.order ?? [];
  const passSize = order.length || total;
  const index = prog?.index ?? 0;
  const finished = Boolean(deck) && passSize > 0 && index >= passSize;
  const card =
    deck && !finished
      ? (deck.cards.find((item) => item.id === order[index]) ?? null)
      : null;
  const ratings = prog?.ratings ?? {};
  const gotCount = Object.values(ratings).filter((r) => r === "got").length;
  const againCount = Object.values(ratings).filter((r) => r === "again").length;
  const pct = passSize ? Math.min(100, (index / passSize) * 100) : 0;

  /* ---------- persistence ---------- */

  useEffect(() => {
    const ok = saveState(state);
    if (!ok && !saveFailed.current) {
      saveFailed.current = true;
      toast.error("Couldn't save in this browser — changes may be lost on refresh.");
    }
    if (ok) saveFailed.current = false;
  }, [state]);

  /* ---------- theme ---------- */

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const resolved: "light" | "dark" =
    state.theme === "system" ? (systemDark ? "dark" : "light") : state.theme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const cycleTheme = () => {
    const next: Theme =
      state.theme === "light" ? "dark" : state.theme === "dark" ? "system" : "light";
    setState((s) => ({ ...s, theme: next }));
  };

  /* ---------- navigation ---------- */

  const patchProgress = (
    deckId: string,
    update: (progress: DeckProgress) => DeckProgress,
  ) => {
    setState((s) => {
      const current = s.progress[deckId];
      if (!current) return s;
      return {
        ...s,
        progress: { ...s.progress, [deckId]: update(current) },
      };
    });
  };

  const go = (delta: number) => {
    if (!deck || !prog) return;
    const next = Math.min(Math.max(prog.index + delta, 0), passSize);
    if (next === prog.index) return;
    setFlipped(false);
    setAnim({ dir: delta >= 0 ? 1 : -1, mode: "nav" });
    patchProgress(deck.id, (p) => ({ ...p, index: next }));
  };

  const rate = (rating: Rating) => {
    if (!deck || !prog || !card) return;
    const next = Math.min(prog.index + 1, passSize);
    setFlipped(false);
    setAnim({ dir: rating === "got" ? 1 : -1, mode: "rate" });
    patchProgress(deck.id, (p) => ({
      ...p,
      index: next,
      ratings: { ...p.ratings, [card.id]: rating },
    }));
  };

  const shuffle = () => {
    if (!deck) return;
    setFlipped(false);
    setAnim({ dir: 1, mode: "nav" });
    setState((s) => ({
      ...s,
      progress: {
        ...s.progress,
        [deck.id]: {
          order: shuffleIds(deck.cards.map((c) => c.id)),
          index: 0,
          ratings: {},
        },
      },
    }));
    toast.success("Shuffled");
  };

  const reset = () => {
    if (!deck) return;
    if (!resetArmed) {
      setResetArmed(true);
      toast("Press R again to reset this deck", { duration: 2600 });
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setResetArmed(false), 3000);
      return;
    }
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    setResetArmed(false);
    setFlipped(false);
    setAnim({ dir: 1, mode: "nav" });
    setState((s) => ({
      ...s,
      progress: { ...s.progress, [deck.id]: makeProgress(deck) },
    }));
    toast.success("Deck reset");
  };

  const reviewMissed = () => {
    if (!deck || !prog) return;
    const missed = deck.cards
      .filter((item) => prog.ratings[item.id] === "again")
      .map((item) => item.id);
    if (missed.length === 0) return;
    setFlipped(false);
    setAnim({ dir: 1, mode: "nav" });
    setState((s) => ({
      ...s,
      progress: {
        ...s.progress,
        [deck.id]: { order: missed, index: 0, ratings: {} },
      },
    }));
  };

  const restart = () => {
    if (!deck) return;
    setFlipped(false);
    setAnim({ dir: 1, mode: "nav" });
    setState((s) => ({
      ...s,
      progress: { ...s.progress, [deck.id]: makeProgress(deck) },
    }));
  };

  /* ---------- import ---------- */

  const importDeck = (name: string, cards: Flashcard[]) => {
    const created = newDeck(name, cards);
    const { state: next, evicted } = addDeck(state, created);
    setState(next);
    setFlipped(false);
    setAnim({ dir: 1, mode: "nav" });
    toast.success(
      `Imported ${cards.length} card${cards.length === 1 ? "" : "s"}`,
    );
    if (created.transient) {
      toast("This deck is large — it won't survive a refresh.", {
        duration: 5000,
      });
    }
    for (const gone of evicted) {
      toast(`Removed “${gone}” to make room.`);
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > 5_000_000) {
      toast.error("That file is over 5 MB.");
      return;
    }
    let text = "";
    try {
      text = await file.text();
    } catch {
      toast.error("Couldn't read that file.");
      return;
    }

    const parsed = parseCsv(text);
    if (!parsed.ok) {
      toast.error(parsed.message);
      return;
    }

    const name = deckNameFromFile(file.name);
    if (parsed.auto) {
      const cards = toCards(parsed.data, parsed.auto);
      if (cards.length === 0) {
        toast.error("No usable rows — each row needs a front and a back.");
        return;
      }
      importDeck(name, cards);
    } else {
      setPending({ data: parsed.data, name });
    }
  };

  const confirmMapping = (mapping: Mapping) => {
    if (!pending) return;
    const cards = toCards(pending.data, mapping);
    if (cards.length === 0) {
      toast.error("No usable rows — each row needs a front and a back.");
      return;
    }
    const name = pending.name;
    setPending(null);
    importDeck(name, cards);
  };

  const dragging = useFileDrop(handleFile);

  /* ---------- decks ---------- */

  const selectDeck = (id: string) => {
    setDeckOpen(false);
    setFlipped(false);
    setAnim({ dir: 1, mode: "nav" });
    setState((s) => ({ ...s, activeDeckId: id }));
  };

  const remove = (target: Deck) => {
    const snapshot = target;
    const snapshotProgress = state.progress[target.id] ?? makeProgress(target);
    setState((s) => removeDeck(s, target.id));
    setFlipped(false);
    toast(`Removed “${target.name}”`, {
      action: {
        label: "Undo",
        onClick: () => {
          setState((s) => ({
            ...s,
            decks: [snapshot, ...s.decks],
            progress: { ...s.progress, [snapshot.id]: snapshotProgress },
            activeDeckId: snapshot.id,
          }));
        },
      },
    });
  };

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (pending || deckOpen) return;

      const key = event.key;

      if (key === " " || key === "Enter") {
        if (!card) return;
        if (target?.closest("button")) return;
        event.preventDefault();
        setFlipped((value) => !value);
        return;
      }

      switch (key) {
        case "ArrowRight":
        case "l":
        case "L":
          event.preventDefault();
          go(1);
          break;
        case "ArrowLeft":
        case "h":
        case "H":
          event.preventDefault();
          go(-1);
          break;
        case "1":
          if (flipped) rate("again");
          break;
        case "2":
          if (flipped) rate("got");
          break;
        case "s":
        case "S":
          shuffle();
          break;
        case "r":
        case "R":
          reset();
          break;
        case "i":
        case "I":
          fileRef.current?.click();
          break;
        case "d":
        case "D":
          if (deck) setDeckOpen((value) => !value);
          break;
        case "t":
        case "T":
          cycleTheme();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  /* ---------- render ---------- */

  const transition = useMemo(
    () =>
      reduce
        ? { duration: 0.12 }
        : { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.8 },
    [reduce],
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[820px] items-center gap-2 px-4">
          {deck ? (
            <DeckSwitcher
              decks={state.decks}
              activeId={state.activeDeckId}
              open={deckOpen}
              onOpenChange={setDeckOpen}
              onSelect={selectDeck}
              onRemove={remove}
              onImport={() => {
                setDeckOpen(false);
                fileRef.current?.click();
              }}
            />
          ) : (
            <span className="pl-1 font-heading text-[15px] font-semibold tracking-[-0.01em]">
              Flashcards
            </span>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="icon"
              aria-label="Import CSV"
              title="Import CSV (I)"
              onClick={() => fileRef.current?.click()}
            >
              <IconUpload width={17} height={17} />
            </Button>
            <ThemeToggle mode={state.theme} onCycle={cycleTheme} />
          </div>
        </div>

        <div className="h-px w-full bg-line">
          <motion.div
            className="h-px bg-accent"
            animate={{ width: `${pct}%` }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 170, damping: 26 }
            }
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[820px] flex-1 flex-col px-4 pb-6 pt-5 sm:pt-8">
        <div className="flex flex-1 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false} custom={anim}>
            {!deck ? (
              <EmptyState key="empty" onImport={() => fileRef.current?.click()} />
            ) : finished ? (
              <Summary
                key="summary"
                total={passSize}
                got={gotCount}
                again={againCount}
                onReviewMissed={reviewMissed}
                onRestart={restart}
                onShuffle={shuffle}
              />
            ) : card ? (
              <motion.div
                key={card.id}
                custom={anim}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={transition}
                className="w-full max-w-[720px]"
              >
                <Card
                  card={card}
                  flipped={flipped}
                  onFlip={() => setFlipped((value) => !value)}
                  onRate={rate}
                  onSwipe={(direction) => go(direction)}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {deck && total > 0 ? (
          <div className="mt-5 flex items-center justify-center gap-1.5">
            <Button
              variant="icon"
              aria-label="Previous card"
              title="Previous (←)"
              disabled={index <= 0}
              onClick={() => go(-1)}
            >
              <IconChevronLeft />
            </Button>

            <span className="min-w-[72px] text-center text-sm tabular-nums text-muted">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={index}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.16 }}
                  className="inline-block"
                >
                  {Math.min(index + 1, passSize)} / {passSize}
                </motion.span>
              </AnimatePresence>
            </span>

            <Button
              variant="icon"
              aria-label="Next card"
              title="Next (→)"
              disabled={index >= passSize}
              onClick={() => go(1)}
            >
              <IconChevronRight />
            </Button>

            <Button
              variant="icon"
              aria-label="Shuffle deck"
              title="Shuffle (S)"
              className="ml-2"
              onClick={shuffle}
            >
              <IconShuffle />
            </Button>
          </div>
        ) : null}

        {deck ? (
          <>
            <p className="mt-4 hidden text-center text-[11px] tracking-wide text-muted sm:block">
              <Kbd>Space</Kbd> flip · <Kbd>←</Kbd> <Kbd>→</Kbd> move ·{" "}
              <Kbd>1</Kbd> again · <Kbd>2</Kbd> got it · <Kbd>S</Kbd> shuffle ·{" "}
              <Kbd>R</Kbd> reset · <Kbd>I</Kbd> import · <Kbd>D</Kbd> decks ·{" "}
              <Kbd>T</Kbd> theme
            </p>
            <p className="mt-4 text-center text-[11px] tracking-wide text-muted sm:hidden">
              Swipe to move · tap to flip
            </p>
          </>
        ) : null}
      </main>

      <p className="sr-only" aria-live="polite">
        {deck
          ? finished
            ? `Deck complete. ${gotCount} got it, ${againCount} again.`
            : `Card ${Math.min(index + 1, passSize)} of ${passSize}`
          : "No deck loaded"}
      </p>

      <ColumnMapper
        open={Boolean(pending)}
        name={pending?.name ?? ""}
        data={pending?.data ?? null}
        onCancel={() => setPending(null)}
        onConfirm={confirmMapping}
      />

      <DropOverlay visible={dragging} />

      <Toaster
        position="top-center"
        offset={68}
        mobileOffset={68}
        theme={resolved}
        closeButton={false}
        toastOptions={{ style: { fontSize: "13px" } }}
      />
    </div>
  );
}
