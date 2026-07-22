"use client";

import { useEffect, useMemo, useState } from "react";
import { MASCOT_ROWS } from "./mascot-art";

/**
 * Monochrome ASCII rendering of the mascot, used as the auth-pages backdrop.
 *
 * The art is a density grid (0 = empty … 4 = darkest). On mount the inked
 * cells fade in mosaic-style in a scattered order; afterwards the glyphs keep
 * being re-picked from the palette of their density, so the portrait stays
 * recognisable while its texture keeps shifting.
 */

/** Glyph palettes per density level; index 0 is empty. */
const PALETTES = ["", ".,'`", ":;~+", "*=oxs", "#%@&"];

const REVEAL_MS = 26; // cadence of the mosaic reveal
const REVEAL_BATCH = 12; // cells added per reveal step
const SHUFFLE_MS = 420; // how often visible glyphs are re-picked

/** Cheap deterministic hash — keeps glyphs stable within one shuffle frame. */
function hash(a: number, b: number) {
  let h = (a * 2654435761) ^ (b * 40503);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  return (h ^ (h >>> 13)) >>> 0;
}

const WIDTH = Math.max(...MASCOT_ROWS.map((r) => r.length));

export default function MascotAscii() {
  // Reveal order: every inked cell, scattered deterministically.
  const { rank, total } = useMemo(() => {
    const cells: number[] = [];
    MASCOT_ROWS.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== "0") cells.push(y * WIDTH + x);
      }
    });
    const shuffled = [...cells].sort((a, b) => hash(a, 7) - hash(b, 7));
    const rank = new Map<number, number>();
    shuffled.forEach((cell, i) => rank.set(cell, i));
    return { rank, total: shuffled.length };
  }, []);

  const [revealed, setRevealed] = useState(0);
  const [seed, setSeed] = useState(0);

  // Mosaic reveal, once.
  useEffect(() => {
    if (revealed >= total) return;
    const id = setInterval(
      () => setRevealed((n) => Math.min(total, n + REVEAL_BATCH)),
      REVEAL_MS
    );
    return () => clearInterval(id);
  }, [revealed, total]);

  // Endless glyph re-selection.
  useEffect(() => {
    const id = setInterval(() => setSeed((s) => s + 1), SHUFFLE_MS);
    return () => clearInterval(id);
  }, []);

  const text = useMemo(
    () =>
      MASCOT_ROWS.map((row, y) => {
        let out = "";
        for (let x = 0; x < row.length; x++) {
          const level = row.charCodeAt(x) - 48;
          if (level === 0) {
            out += " ";
            continue;
          }
          const key = y * WIDTH + x;
          if ((rank.get(key) ?? Infinity) >= revealed) {
            out += " ";
            continue;
          }
          const palette = PALETTES[level];
          out += palette[hash(key, seed) % palette.length];
        }
        return out;
      }).join("\n"),
    [revealed, seed, rank]
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 flex select-none items-center justify-center overflow-hidden"
    >
      <pre
        className="font-mono text-gray-900/[0.18]"
        style={{
          // Scale on both axes so the portrait stays large but never overflows.
          fontSize: "clamp(6px, min(1.9vw, 3vh), 34px)",
          lineHeight: 1.02,
          letterSpacing: "0.06em",
          margin: 0,
        }}
      >
        {text}
      </pre>
    </div>
  );
}
