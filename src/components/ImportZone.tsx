import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { IconUpload } from "./icons";

export function useFileDrop(onFile: (file: File) => void) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const handler = useRef(onFile);
  handler.current = onFile;

  useEffect(() => {
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const enter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current += 1;
      setDragging(true);
    };

    const over = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };

    const leave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };

    const drop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth.current = 0;
      setDragging(false);
      const file = event.dataTransfer?.files?.[0];
      if (file) handler.current(file);
    };

    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, []);

  return dragging;
}

export function DropOverlay({ visible }: { visible: boolean }) {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.05 : 0.16 }}
          className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-canvas/75 backdrop-blur-sm"
        >
          <div className="absolute inset-3">
            <svg className="h-full w-full overflow-visible" aria-hidden>
              <rect
                x="1"
                y="1"
                width="100%"
                height="100%"
                rx="26"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeDasharray="10 10"
                className={reduce ? undefined : "drop-ring"}
              />
            </svg>
          </div>

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <span className="grid size-12 place-items-center rounded-full bg-accent text-canvas">
              <IconUpload width={22} height={22} />
            </span>
            <p className="font-heading text-2xl font-semibold tracking-[-0.02em]">Drop to import</p>
            <p className="text-sm text-muted">CSV, TSV or TXT · front and back</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
