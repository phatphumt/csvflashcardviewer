import { motion, useReducedMotion } from "motion/react";
import { Button } from "./Button";
import { IconShuffle } from "./icons";

type Props = {
  total: number;
  got: number;
  again: number;
  onReviewMissed: () => void;
  onRestart: () => void;
  onShuffle: () => void;
};

export function Summary({
  total,
  got,
  again,
  onReviewMissed,
  onRestart,
  onShuffle,
}: Props) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className="w-full max-w-[720px]"
    >
      <div className="rounded-card border border-line bg-surface p-7 sm:p-10">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 52 52" className="size-12 shrink-0" aria-hidden>
            <circle
              cx="26"
              cy="26"
              r="24"
              fill="none"
              stroke="var(--line)"
              strokeWidth="1.5"
            />
            <motion.path
              d="M16 27.5 23 34.5 36 20.5"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: reduce ? 0 : 0.55,
                delay: reduce ? 0 : 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </svg>
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.02em]">Deck complete</h2>
            <p className="mt-0.5 text-sm text-muted">
              {total} card{total === 1 ? "" : "s"} reviewed
            </p>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-canvas/50 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              Got it
            </p>
            <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-accent">{got}</p>
          </div>
          <div className="rounded-xl border border-line bg-canvas/50 px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              Again
            </p>
            <p className="mt-1 font-heading text-3xl font-semibold tabular-nums">{again}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {again > 0 ? (
            <Button onClick={onReviewMissed}>
              Review missed ({again})
            </Button>
          ) : null}
          <Button variant="outline" onClick={onShuffle}>
            <IconShuffle width={15} height={15} />
            Shuffle
          </Button>
          <Button variant="ghost" onClick={onRestart}>
            Restart
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
