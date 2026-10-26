import { Fragment, useMemo } from "react";
import katex from "katex";
import { cn } from "../lib/cn";

const SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

function MathSpan({ expr, display }: { expr: string; display: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(expr, {
        displayMode: display,
        throwOnError: false,
        strict: "ignore",
        trust: false,
      });
    } catch {
      return null;
    }
  }, [expr, display]);

  if (!html) return <span>{display ? `$$${expr}$$` : `$${expr}$`}</span>;

  return (
    <span
      className={display ? "block" : "inline"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = useMemo(() => text.split(SPLIT).filter((p) => p !== ""), [text]);

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {parts.map((part, i) => {
        if (part.length > 4 && part.startsWith("$$") && part.endsWith("$$")) {
          return (
            <MathSpan key={i} expr={part.slice(2, -2)} display />
          );
        }
        if (part.length > 2 && part.startsWith("$") && part.endsWith("$")) {
          return <MathSpan key={i} expr={part.slice(1, -1)} display={false} />;
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </span>
  );
}
