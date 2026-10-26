import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import type { CsvData, Mapping } from "../lib/csv";
import { toCards } from "../lib/csv";
import { RichText } from "./RichText";
import { Button } from "./Button";
import { IconChevronDown, IconX } from "./icons";

type Props = {
  open: boolean;
  name: string;
  data: CsvData | null;
  onCancel: () => void;
  onConfirm: (mapping: Mapping) => void;
};

function ColumnSelect({
  label,
  value,
  columns,
  onChange,
}: {
  label: string;
  value: string;
  columns: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <SelectPrimitive.Root value={value} onValueChange={onChange}>
        <SelectPrimitive.Trigger className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-ink transition-colors hover:border-[color-mix(in_oklab,var(--accent)_35%,var(--line))]">
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon>
            <IconChevronDown width={15} height={15} />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className="z-[90] max-h-64 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.35)]"
          >
            <SelectPrimitive.Viewport>
              {columns.map((column, index) => (
                <SelectPrimitive.Item
                  key={`${column}-${index}`}
                  value={String(index)}
                  className="flex h-9 cursor-pointer select-none items-center rounded-lg px-2.5 text-sm text-ink outline-none data-[highlighted]:bg-accent-soft"
                >
                  <SelectPrimitive.ItemText>
                    {column}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </label>
  );
}

export function ColumnMapper({ open, name, data, onCancel, onConfirm }: Props) {
  const [front, setFront] = useState("0");
  const [back, setBack] = useState("1");

  useEffect(() => {
    if (!data) return;
    setFront("0");
    setBack(data.columns.length > 1 ? "1" : "0");
  }, [data]);

  const mapping = useMemo<Mapping | null>(() => {
    if (!data) return null;
    const f = Number(front);
    const b = Number(back);
    if (!Number.isInteger(f) || !Number.isInteger(b) || f === b) return null;
    if (f >= data.columns.length || b >= data.columns.length) return null;
    return { front: f, back: b };
  }, [data, front, back]);

  const count = useMemo(() => {
    if (!data || !mapping) return 0;
    return toCards(data, mapping).length;
  }, [data, mapping]);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (!next ? onCancel() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-[2px] data-[state=open]:animate-[fadeIn_160ms_ease-out]" />
        <Dialog.Content className="group fixed left-1/2 top-1/2 z-[80] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 focus:outline-none">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.45)] group-data-[state=open]:animate-[dialogIn_200ms_cubic-bezier(.16,1,.3,1)]">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <Dialog.Title className="font-heading text-xl font-semibold tracking-[-0.015em]">
                  Match the columns
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted">
                  <span className="text-ink">{name}</span> has more than two
                  columns. Pick which ones hold the question and the answer.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="icon" aria-label="Close">
                  <IconX width={16} height={16} />
                </Button>
              </Dialog.Close>
            </div>

            {data ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <ColumnSelect
                    label="Front"
                    value={front}
                    columns={data.columns}
                    onChange={setFront}
                  />
                  <ColumnSelect
                    label="Back"
                    value={back}
                    columns={data.columns}
                    onChange={setBack}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-line bg-canvas/60 p-3">
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                    Preview
                  </p>
                  <div className="space-y-2">
                    {data.rows.slice(0, 2).map((row, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
                      >
                        <p className="font-heading font-medium leading-snug">
                          <RichText text={row[Number(front)] ?? ""} />
                        </p>
                        <p className="mt-1 text-[13px] leading-snug text-muted">
                          <RichText text={row[Number(back)] ?? ""} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                disabled={!mapping || count === 0}
                onClick={() => mapping && onConfirm(mapping)}
              >
                {count > 0 ? `Import ${count} card${count === 1 ? "" : "s"}` : "Import"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
