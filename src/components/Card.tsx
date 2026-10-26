import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import type { Flashcard, Rating } from "../lib/decks";
import { RichText } from "./RichText";
import { Button } from "./Button";

type Props = {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  onRate: (rating: Rating) => void;
  onSwipe: (direction: 1 | -1) => void;
};

const flipSpring = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.9,
} as const;

export function Card({ card, flipped, onFlip, onRate, onSwipe }: Props) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 0, 320], [-6, 0, 6]);
  const opacity = useTransform(x, [-380, -180, 0, 180, 380], [0.5, 1, 1, 1, 0.5]);
  const tiltX = useSpring(0, { stiffness: 220, damping: 24 });
  const tiltY = useSpring(0, { stiffness: 220, damping: 24 });

  const surface = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const down = useRef<{ x: number; y: number } | null>(null);

  const handleMove = (event: React.MouseEvent) => {
    if (reduce) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = surface.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    tiltY.set(px * 9);
    tiltX.set(-py * 7);
  };

  const resetTilt = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  const handleBackClick = (event: React.MouseEvent) => {
    if (dragged.current) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const start = down.current;
    if (!start) return;
    if (
      Math.abs(event.clientX - start.x) > 8 ||
      Math.abs(event.clientY - start.y) > 8
    ) {
      return;
    }
    onFlip();
  };

  return (
    <div
      ref={surface}
      className="perspective w-full"
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
    >
      <motion.div
        style={{ x, rotate, opacity }}
        drag={reduce ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        dragMomentum={false}
        onDragStart={() => {
          dragged.current = false;
        }}
        onDrag={(_, info) => {
          if (Math.abs(info.offset.x) > 6) dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          const offset = info.offset.x;
          const velocity = info.velocity.x;
          if (offset < -90 || velocity < -600) onSwipe(1);
          else if (offset > 90 || velocity > 600) onSwipe(-1);
          window.setTimeout(() => {
            dragged.current = false;
          }, 40);
        }}
        className="relative touch-pan-y"
      >
        <motion.div
          style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }}
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : flipSpring}
            style={{ transformStyle: "preserve-3d" }}
            className="relative h-[clamp(330px,52vh,470px)] w-full"
          >
            {/* front */}
            <div
              className="card-face absolute inset-0"
              style={{ transform: "rotateY(0deg)" }}
              aria-hidden={flipped}
            >
              <button
                type="button"
                onClick={() => {
                  if (dragged.current) return;
                  onFlip();
                }}
                tabIndex={flipped ? -1 : 0}
                aria-label="Show answer"
                className="group flex h-full w-full flex-col rounded-card border border-line bg-surface p-6 text-left transition-colors hover:border-[color-mix(in_oklab,var(--accent)_35%,var(--line))] sm:p-10"
              >
                <span className="flex items-center gap-2">
                  {card.isFormula ? (
                    <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                      Formula
                    </span>
                  ) : null}
                </span>

                <span className="no-scrollbar flex flex-1 flex-col overflow-y-auto py-6">
                  <span className="my-auto block font-heading text-[clamp(1.24rem,2.3vw,1.85rem)] font-semibold leading-[1.34] tracking-[-0.02em] text-ink">
                    <RichText text={card.front} />
                  </span>
                </span>

                <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted">
                  <span>Tap to reveal</span>
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] tracking-normal">
                      Space
                    </kbd>
                  </span>
                </span>
              </button>
            </div>

            {/* back */}
            <div
              className="card-face absolute inset-0"
              style={{ transform: "rotateY(180deg)" }}
              aria-hidden={!flipped}
            >
              <div
                className="flex h-full w-full flex-col rounded-card border border-line bg-surface p-6 sm:p-10"
                onPointerDown={(event) => {
                  down.current = { x: event.clientX, y: event.clientY };
                }}
                onClick={handleBackClick}
              >
                <span className="mb-4 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                  Answer
                </span>

                <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto pr-1">
                  <div className="my-auto">
                    <motion.div
                      animate={{
                        clipPath: flipped
                          ? "inset(0 0 0% 0)"
                          : "inset(0 0 100% 0)",
                      }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { duration: 0.34, ease: [0.16, 1, 0.3, 1] }
                      }
                    >
                      <RichText
                        text={card.back}
                        className="text-[1.02rem] leading-relaxed text-ink sm:text-[1.1rem]"
                      />
                    </motion.div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2.5">
                  <Button
                    variant="outline"
                    className="flex-1"
                    tabIndex={flipped ? 0 : -1}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRate("again");
                    }}
                  >
                    Again
                    <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] text-muted sm:inline">
                      1
                    </kbd>
                  </Button>
                  <Button
                    variant="solid"
                    className="flex-1"
                    tabIndex={flipped ? 0 : -1}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRate("got");
                    }}
                  >
                    Got it
                    <kbd className="hidden rounded border border-current px-1.5 py-0.5 text-[10px] opacity-50 sm:inline">
                      2
                    </kbd>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
