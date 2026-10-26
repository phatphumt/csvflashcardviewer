import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Theme } from "../lib/decks";
import { IconMonitor, IconMoon, IconSun } from "./icons";

export function ThemeToggle({
  mode,
  onCycle,
}: {
  mode: Theme;
  onCycle: () => void;
}) {
  const reduce = useReducedMotion();
  const Icon = mode === "dark" ? IconMoon : mode === "light" ? IconSun : IconMonitor;

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`Theme: ${mode}. Change theme.`}
      title={`Theme: ${mode}`}
      className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-ink"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={mode}
          initial={reduce ? { opacity: 0 } : { opacity: 0, rotate: -25, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, rotate: 25, scale: 0.8 }}
          transition={{ duration: reduce ? 0.05 : 0.16 }}
          className="grid place-items-center"
        >
          <Icon width={17} height={17} />
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
