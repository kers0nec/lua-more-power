/**
 * Cross-platform environment shim for the LuaMore VM generator.
 *
 * The engine is otherwise pure TypeScript, but a few build-time paths reach
 * for Node globals (process.env debug flags, crypto randomness, fs dumps,
 * Buffer byte length). Those calls are all debug/seed-only and are wrapped in
 * try/catch, but referencing the bare globals breaks bundling for the browser
 * (the same module runs client-side in the playground). Everything here works
 * identically in Node, Vite/SSR and the browser.
 */

function getEnv(name: string): string | undefined {
  try {
    // process exists under Node/Nitro and Vite SSR; it is undefined in browsers.
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    return proc?.env?.[name];
  } catch {
    return undefined;
  }
}

export function envFlag(name: string): boolean {
  return getEnv(name) === "1";
}

/** Cryptographically-strong random bytes, falling back to Math.random. */
export function secureRandomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  try {
    const g = globalThis as {
      crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array };
    };
    if (g.crypto?.getRandomValues) {
      g.crypto.getRandomValues(buf);
      return buf;
    }
  } catch {
    /* fall through */
  }
  for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf;
}

/** Monotonic high-resolution timer seed (seconds, nanos); zeros if unavailable. */
export function hiresSeed(): [number, number] {
  try {
    const proc = (globalThis as {
      process?: { hrtime?: () => [number, number]; pid?: number };
    }).process;
    if (proc?.hrtime) return proc.hrtime();
  } catch {
    /* ignore */
  }
  const t = typeof performance !== "undefined" ? performance.now() : Date.now() / 1000;
  return [Math.floor(t), Math.floor((t % 1) * 1e9)];
}

export function processPid(): number {
  try {
    const proc = (globalThis as { process?: { pid?: number } }).process;
    if (typeof proc?.pid === "number") return proc.pid;
  } catch {
    /* ignore */
  }
  return 0;
}

/** UTF-8 byte length without Buffer (TextEncoder is everywhere we run). */
export function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Debug dump of the raw VM; a no-op outside Node. */
export function debugDump(name: string, content: string): void {
  try {
    const requireFn = (globalThis as { require?: (m: string) => unknown }).require;
    const fs = requireFn?.("fs") as
      | { writeFileSync?: (p: string, c: string, enc?: string) => void }
      | undefined;
    fs?.writeFileSync?.(name, content, "utf-8");
    // eslint-disable-next-line no-console
    console.log(`[RegVM] DUMP: saved ${content.length} chars to ${name}`);
  } catch {
    /* not Node — ignore */
  }
}
