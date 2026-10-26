import { motion, useReducedMotion } from "motion/react";
import { Button } from "./Button";
import { IconLayers, IconUpload } from "./icons";

export function EmptyState({ onImport }: { onImport: () => void }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0.1 : 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[720px]"
    >
      <div className="flex h-[clamp(300px,44vh,390px)] flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface/50 p-8 text-center">
        <div className="grid size-12 place-items-center rounded-full border border-line text-muted">
          <IconLayers width={20} height={20} />
        </div>
        <h1 className="mt-5 font-heading text-2xl font-semibold tracking-[-0.02em]">No deck yet</h1>
        <p className="mt-1.5 max-w-[36ch] text-sm leading-relaxed text-muted">
          Drop a CSV anywhere, or pick a file. Two columns are all you need —
          front and back.
        </p>
        <Button className="mt-6" onClick={onImport}>
          <IconUpload width={16} height={16} />
          Import CSV
        </Button>
        <p className="mt-3 text-[11px] tracking-wide text-muted">
          .csv · .tsv · .txt
        </p>
      </div>
    </motion.div>
  );
}
