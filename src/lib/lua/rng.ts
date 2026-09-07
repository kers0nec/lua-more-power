/**
 * Deterministic, seedable PRNG used by every stage of the obfuscator.
 *
 * Determinism matters: two builds with the same seed produce byte-identical
 * output, which makes the differential test-suite reproducible and lets a
 * failed build be replayed exactly.
 */

export type RNG = {
  /** 32-bit unsigned integer */
  next(): number;
  /** integer in [0, n) */
  int(n: number): number;
  /** integer in [min, max] inclusive */
  range(min: number, max: number): number;
  /** float in [0, 1) */
  float(): number;
  pick<T>(items: readonly T[]): T;
  /** Fisher–Yates, in place */
  shuffle<T>(items: T[]): T[];
  bool(pTrue?: number): boolean;
  /** fork a child stream so sub-generators stay independent */
  fork(): RNG;
};

export function createRng(seed?: number): RNG {
  let s = (seed ?? (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) >>> 0;
  if (s === 0) s = 0x9e3779b9;

  const next = (): number => {
    // xorshift32 — small, fast, good enough avalanche for code generation
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s;
  };

  const rng: RNG = {
    next,
    int: (n) => (n <= 0 ? 0 : next() % n),
    range: (min, max) => (max <= min ? min : min + (next() % (max - min + 1))),
    float: () => next() / 0x100000000,
    pick: (items) => items[next() % items.length],
    shuffle: (items) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = next() % (i + 1);
        const tmp = items[i];
        items[i] = items[j];
        items[j] = tmp;
      }
      return items;
    },
    bool: (pTrue = 0.5) => rng.float() < pTrue,
    fork: () => createRng(next()),
  };

  // warm up the state so low-entropy seeds do not produce correlated streams
  for (let i = 0; i < 8; i++) next();

  return rng;
}

/** Stable 32-bit string hash (FNV-1a) — used to derive default seeds. */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
