import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

type Variant = "solid" | "outline" | "ghost" | "icon";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  solid:
    "h-11 px-5 rounded-full bg-accent text-canvas font-medium hover:opacity-90 active:scale-[0.985]",
  outline:
    "h-11 px-5 rounded-full border border-line text-ink font-medium hover:bg-accent-soft active:scale-[0.985]",
  ghost:
    "h-11 px-4 rounded-full text-muted font-medium hover:text-ink hover:bg-accent-soft",
  icon: "size-11 rounded-full text-muted hover:text-ink hover:bg-accent-soft",
};

export function Button({ variant = "solid", className, ...props }: Props) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 text-sm transition-[background-color,color,opacity,transform] duration-150 disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        className,
      )}
    />
  );
}
