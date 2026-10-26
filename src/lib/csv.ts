import Papa from "papaparse";
import type { Flashcard } from "./decks";

export type Mapping = { front: number; back: number };

export type CsvData = {
  rows: string[][];
  columns: string[];
  header: string[] | null;
};

export type CsvParse =
  | { ok: true; data: CsvData; auto: Mapping | null }
  | { ok: false; message: string };

const FRONT_ALIASES = new Set([
  "front",
  "question",
  "term",
  "prompt",
  "word",
  "q",
  "ask",
]);

const BACK_ALIASES = new Set([
  "back",
  "answer",
  "definition",
  "meaning",
  "a",
  "translation",
  "response",
]);

const MAX_ROWS = 5000;

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function hash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h + value.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

function looksLikeHeader(row: string[]): boolean {
  const hits = row.filter((cell) => {
    const key = normalize(cell);
    return FRONT_ALIASES.has(key) || BACK_ALIASES.has(key);
  });
  return hits.length >= 2 && row.every((cell) => cell.length <= 48);
}

function findAlias(row: string[], aliases: Set<string>): number {
  return row.findIndex((cell) => aliases.has(normalize(cell)));
}

export function parseCsv(text: string): CsvParse {
  const clean = text.replace(/^\uFEFF/, "").trim();
  if (!clean) return { ok: false, message: "That file is empty." };

  const result = Papa.parse<string[]>(clean, {
    skipEmptyLines: "greedy",
  });

  const rows = result.data
    .filter((row) => Array.isArray(row))
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  if (rows.length === 0) {
    return { ok: false, message: "No rows found in that file." };
  }

  if (rows.length > MAX_ROWS) {
    return {
      ok: false,
      message: `That file has too many rows (limit ${MAX_ROWS.toLocaleString()}).`,
    };
  }

  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  if (width < 2) {
    return {
      ok: false,
      message: "Need at least two columns — a front and a back.",
    };
  }

  const padded = rows.map((row) =>
    Array.from({ length: width }, (_, i) => row[i] ?? ""),
  );

  const header = looksLikeHeader(padded[0]) ? padded[0] : null;
  const body = header ? padded.slice(1) : padded;

  if (body.length === 0) {
    return { ok: false, message: "That file only has a header row." };
  }

  const columns = header
    ? header.map((cell, i) => cell || `Column ${i + 1}`)
    : Array.from({ length: width }, (_, i) => `Column ${i + 1}`);

  const data: CsvData = { rows: body, columns, header };

  let auto: Mapping | null = null;
  if (header) {
    const front = findAlias(header, FRONT_ALIASES);
    const back = findAlias(header, BACK_ALIASES);
    if (front !== -1 && back !== -1 && front !== back) auto = { front, back };
  } else if (width === 2) {
    auto = { front: 0, back: 1 };
  }

  return { ok: true, data, auto };
}

export function toCards(data: CsvData, mapping: Mapping): Flashcard[] {
  const cards: Flashcard[] = [];

  data.rows.forEach((row, index) => {
    const rawFront = (row[mapping.front] ?? "").trim();
    const rawBack = (row[mapping.back] ?? "").trim();
    if (!rawFront || !rawBack) return;

    const formula = rawFront.match(/^formula\s*:\s*/i);
    const front = formula ? rawFront.slice(formula[0].length).trim() : rawFront;
    if (!front) return;

    cards.push({
      id: `${hash(front + "\u0000" + rawBack)}-${index.toString(36)}`,
      front,
      back: rawBack,
      isFormula: Boolean(formula),
    });
  });

  return cards;
}
