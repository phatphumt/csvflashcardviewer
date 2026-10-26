import * as Popover from "@radix-ui/react-popover";
import { motion, useReducedMotion } from "motion/react";
import type { Deck } from "../lib/decks";
import { cn } from "../lib/cn";
import { IconChevronDown, IconUpload, IconX } from "./icons";

type Props = {
  decks: Deck[];
  activeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onRemove: (deck: Deck) => void;
  onImport: () => void;
};

export function DeckSwitcher({
  decks,
  activeId,
  open,
  onOpenChange,
  onSelect,
  onRemove,
  onImport,
}: Props) {
  const active = decks.find((deck) => deck.id === activeId) ?? null;
  const reduce = useReducedMotion();

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Switch deck"
          className="flex min-w-0 items-center gap-2 rounded-full py-1.5 pl-3 pr-2.5 text-sm transition-colors hover:bg-accent-soft"
        >
          <span className="max-w-[38vw] truncate font-heading text-[15px] font-semibold tracking-[-0.01em] sm:max-w-[280px]">
            {active?.name ?? "No deck"}
          </span>
          <span className="text-xs tabular-nums text-muted">
            {active?.cards.length ?? 0}
          </span>
          <IconChevronDown width={14} height={14} className="text-muted" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="group z-[60] outline-none"
        >
          <div className="w-[min(86vw,340px)] rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_50px_-24px_rgb(0_0_0/0.35)] group-data-[state=open]:animate-[popIn_160ms_cubic-bezier(.16,1,.3,1)]">
            <div className="px-2.5 pb-1.5 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              Your decks
            </div>

            <div className="max-h-[46vh] overflow-y-auto">
              {decks.map((deck) => {
                const isActive = deck.id === activeId;
                return (
                  <div
                    key={deck.id}
                    className={cn(
                      "group/row flex items-center gap-1 rounded-xl pr-1 transition-colors",
                      isActive ? "bg-accent-soft" : "hover:bg-accent-soft/60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(deck.id)}
                      aria-current={isActive ? "true" : undefined}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-2.5 text-left"
                    >
                      <span className="relative flex size-2 shrink-0 items-center justify-center">
                        {isActive ? (
                          <motion.span
                            layoutId="deck-dot"
                            className="size-1.5 rounded-full bg-accent"
                            transition={
                              reduce
                                ? { duration: 0 }
                                : {
                                    type: "spring",
                                    stiffness: 420,
                                    damping: 32,
                                  }
                            }
                          />
                        ) : null}
                      </span>
                      <span className="truncate text-sm text-ink">{deck.name}</span>
                      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted">
                        {deck.cards.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemove(deck)}
                      aria-label={`Remove ${deck.name}`}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-muted opacity-60 transition-opacity hover:bg-line/60 hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100"
                    >
                      <IconX width={14} height={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-1 border-t border-line pt-1">
              <button
                type="button"
                onClick={onImport}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm text-ink transition-colors hover:bg-accent-soft"
              >
                <IconUpload width={15} height={15} className="text-muted" />
                Import CSV…
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
