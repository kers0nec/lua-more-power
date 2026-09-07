/**
 * Semantics-preserving source transforms:
 *   - alpha-conversion of locals (safe because scope resolution is real)
 *   - numeric constant splitting / re-encoding
 *   - opaque-predicate dead code injection
 */

import type { Chunk, Expression, NumericLiteral, Statement } from "./ast.ts";
import { visit } from "./walk.ts";
import type { Resolution } from "./scope.ts";
import { LUA_KEYWORDS } from "./lexer.ts";
import type { RNG } from "./rng.ts";

/* --------------------------------------------------------------- renaming */

const NAME_CHARS = ["l", "I", "1", "i", "L", "O", "0", "o"];

export function createNameGenerator(rng: RNG, reserved: Set<string>): () => string {
  let n = 0;
  const used = new Set<string>(reserved);
  return (): string => {
    for (let attempt = 0; attempt < 1000; attempt++) {
      n++;
      const len = rng.range(4, 8);
      let name = "_";
      for (let i = 0; i < len; i++) name += rng.pick(NAME_CHARS);
      name += n.toString(36);
      if (used.has(name) || LUA_KEYWORDS.has(name)) continue;
      used.add(name);
      return name;
    }
    throw new Error("name generator exhausted");
  };
}

/** Names that must never be reused for a renamed local. */
export function collectReservedNames(chunk: Chunk, globals: Set<string>): Set<string> {
  const reserved = new Set<string>(globals);
  for (const k of LUA_KEYWORDS) reserved.add(k);
  visit(chunk, {
    onExpression: (e) => {
      if (e.kind === "IndexExpression" && e.syntax === ".") {
        reserved.add((e.index as { name: string }).name);
      } else if (e.kind === "MethodCallExpression") {
        reserved.add(e.method.name);
      }
      return undefined;
    },
    onStatement: (s) => {
      if (s.kind === "LocalStatement") {
        // table-constructor keys are handled below; nothing to do here
      }
      return undefined;
    },
  });
  // table constructor `key = value` names
  visit(chunk, {
    onExpression: (e) => {
      if (e.kind === "TableConstructor") {
        for (const f of e.fields) if (f.keyKind === "name") reserved.add(String(f.key));
      }
      return undefined;
    },
  });
  return reserved;
}

export function renameLocals(chunk: Chunk, resolution: Resolution, rng: RNG): number {
  const reserved = collectReservedNames(chunk, resolution.globals);
  const gen = createNameGenerator(rng, reserved);

  const names = new Map<number, string>();
  for (const d of resolution.declarations) {
    if (!d.keepName) names.set(d.id, gen());
  }

  let renamed = 0;
  visit(chunk, {
    onExpression: (e) => {
      if (e.kind === "Identifier" && !e.isProperty && e.decl) {
        const next = names.get(e.decl.id);
        if (next) {
          e.name = next;
          renamed++;
        }
      }
      return undefined;
    },
  });

  // labels: only rename names that are globally unique, so a goto can never be
  // re-pointed at a different block's label
  const unique = new Map<string, string>();
  for (const [label, count] of resolution.labelCounts) {
    if (count === 1) unique.set(label, gen());
  }
  if (unique.size > 0) {
    visit(chunk, {
      onStatement: (s) => {
        if (s.kind === "LabelStatement" || s.kind === "GotoStatement") {
          const next = unique.get(s.label);
          if (next) s.label = next;
        }
        return undefined;
      },
    });
  }

  return renamed;
}

/* ---------------------------------------------------------------- numbers */

export interface NumberOptions {
  /** target supports `//` and bitwise operators (Lua 5.3+/Luau) */
  modernOps?: boolean;
  /** 0..1 share of eligible literals that get rewritten */
  density?: number;
}

function intLiteral(value: number): NumericLiteral {
  return {
    kind: "NumericLiteral",
    value,
    raw: String(value),
    isInteger: true,
  };
}

function bin(op: string, left: Expression, right: Expression): Expression {
  return { kind: "BinaryExpression", op, left, right, paren: true };
}

function un(op: string, arg: Expression): Expression {
  return { kind: "UnaryExpression", op, arg, paren: true };
}

/**
 * Rewrite numeric literals into equivalent expressions.
 *
 * Every identity used here is exact: for floats only operations that are
 * exactly representable (halving/doubling, `^1`, double negation), and for
 * integers only integer-closed operations on the target runtime.
 */
export function obfuscateNumbers(chunk: Chunk, rng: RNG, options: NumberOptions = {}): number {
  const density = options.density ?? 0.85;
  const modernOps = options.modernOps ?? true;
  let changed = 0;

  const build = (e: NumericLiteral): Expression | null => {
    if (e.suffix) return null; // Luau 64-bit literals must stay literal
    const v = e.value;
    if (!Number.isFinite(v)) return null;
    // Beyond 2^53 the parsed value is not the literal's real value, so any
    // "equivalent" expression we build would be equivalent to the wrong number.
    if (e.isInteger && !Number.isSafeInteger(v)) return null;

    const asInt = e.isInteger && Number.isInteger(v);

    if (asInt) {
      if (Math.abs(v) > 2 ** 48) return null;
      const choices: Array<() => Expression> = [];
      const a = rng.range(1, 4096);
      choices.push(() => bin("+", intLiteral(v - a), intLiteral(a)));
      choices.push(() => bin("-", intLiteral(v + a), intLiteral(a)));
      const factor = pickDivisor(v, rng);
      if (factor) {
        choices.push(() => bin("*", intLiteral(factor), intLiteral(v / factor)));
        if (modernOps) choices.push(() => bin("//", intLiteral(v * factor), intLiteral(factor)));
      }
      const xor = rng.int(0xffff);
      if (modernOps && Number.isInteger(v ^ xor)) {
        choices.push(() => bin("~", intLiteral(v ^ xor), intLiteral(xor)));
      }
      choices.push(() => un("-", un("-", intLiteral(v))));
      choices.push(() => bin("*", intLiteral(v), intLiteral(1)));
      if (modernOps) choices.push(() => bin("//", intLiteral(v), intLiteral(1)));
      return rng.pick(choices)();
    }

    // floats — only exactly-reversible identities
    if (Math.abs(v) < 1e-300 || Math.abs(v) > 1e300) return null;
    const lit = (n: number): NumericLiteral => ({
      kind: "NumericLiteral",
      value: n,
      raw: floatRepr(n),
      isInteger: false,
    });
    const choices: Array<() => Expression> = [
      () => bin("+", lit(v / 2), lit(v / 2)),
      () => bin("/", bin("*", lit(v), lit(2)), lit(2)),
      () => un("-", un("-", lit(v))),
      () => bin("^", lit(v), lit(1)),
      () => bin("+", lit(v / 4), bin("+", lit(v / 4), bin("+", lit(v / 4), lit(v / 4)))),
    ];
    return rng.pick(choices)();
  };

  visit(chunk, {
    onExpression: (e) => {
      if (e.kind !== "NumericLiteral") return undefined;
      if (e.paren) return undefined; // already isolated
      if (rng.float() > density) return undefined;
      const replacement = build(e);
      if (!replacement) return undefined;
      changed++;
      return replacement;
    },
  });

  return changed;
}

/** Re-encode integer literals as hex — same value, different bytes. */
export function hexifyNumbers(chunk: Chunk, rng: RNG, density = 0.5): number {
  let changed = 0;
  visit(chunk, {
    onExpression: (e) => {
      if (e.kind !== "NumericLiteral") return undefined;
      if (!e.isInteger || e.suffix || !Number.isSafeInteger(e.value)) return undefined;
      if (rng.float() > density) return undefined;
      e.raw = "0x" + Math.abs(e.value).toString(16).toUpperCase();
      if (e.value < 0) e.raw = "-" + e.raw;
      changed++;
      return undefined;
    },
  });
  return changed;
}

function pickDivisor(v: number, rng: RNG): number | null {
  const abs = Math.abs(v);
  if (abs < 2) return null;
  const candidates: number[] = [];
  for (let d = 2; d <= 64; d++) if (v % d === 0) candidates.push(d);
  return candidates.length ? rng.pick(candidates) : null;
}

function floatRepr(n: number): string {
  const s = String(n);
  return /[.eE]/.test(s) ? s : s + ".0";
}

/* ------------------------------------------------------------------- junk */

/** Predicates that are true for every possible input, with no side effects. */
function opaqueTrue(rng: RNG): Expression {
  const a = rng.range(2, 999);
  const b = rng.range(2, 999);
  const forms: Array<() => Expression> = [
    // n^2 + n is always even
    () => cmp("%", bin("+", bin("*", intLiteral(a), intLiteral(a)), intLiteral(a)), 2, 0),
    // 7a - 6a == a
    () =>
      eq(
        bin("-", bin("*", intLiteral(7), intLiteral(a)), bin("*", intLiteral(a), intLiteral(6))),
        intLiteral(a),
      ),
    // an empty table is always empty
    () => eq(un("#", { kind: "TableConstructor", fields: [] }), intLiteral(0)),
    // a number is never a table
    () =>
      eqStr(
        {
          kind: "CallExpression",
          callee: { kind: "Identifier", name: "type" },
          args: [intLiteral(a)],
        },
        "number",
      ),
    // a <= b for a < b
    () => cmpRaw("<=", intLiteral(Math.min(a, b)), intLiteral(Math.max(a, b) + 1)),
    // (a+b)*(a-b) == a*a - b*b over the integers
    () =>
      eq(
        bin("*", bin("+", intLiteral(a), intLiteral(b)), bin("-", intLiteral(a), intLiteral(b))),
        bin("-", bin("*", intLiteral(a), intLiteral(a)), bin("*", intLiteral(b), intLiteral(b))),
      ),
  ];
  return rng.pick(forms)();
}

function cmp(op: string, left: Expression, mod: number, result: number): Expression {
  return eq(bin(op, left, intLiteral(mod)), intLiteral(result));
}
function eq(left: Expression, right: Expression): Expression {
  return { kind: "BinaryExpression", op: "==", left, right };
}
function cmpRaw(op: string, left: Expression, right: Expression): Expression {
  return { kind: "BinaryExpression", op, left, right };
}
function eqStr(left: Expression, value: string): Expression {
  return eq(left, { kind: "StringLiteral", bytes: value, raw: JSON.stringify(value) });
}

/** A statement that looks like real work but is unobservable. */
function junkStatement(rng: RNG, index: number): Statement {
  const name = `_J${index.toString(36)}${rng.pick(NAME_CHARS)}`;
  const a = rng.range(2, 999);
  const forms: Array<() => Statement> = [
    () => ({
      kind: "LocalStatement",
      names: [{ kind: "Identifier", name }],
      types: [null],
      attrs: [null],
      values: [
        bin("%", bin("+", bin("*", intLiteral(a), intLiteral(a)), intLiteral(a)), intLiteral(2)),
      ],
    }),
    () => ({
      kind: "LocalStatement",
      names: [{ kind: "Identifier", name }],
      types: [null],
      attrs: [null],
      values: [
        {
          kind: "CallExpression",
          callee: { kind: "Identifier", name: "tostring" },
          args: [intLiteral(a)],
        },
      ],
    }),
    () => ({
      kind: "LocalStatement",
      names: [{ kind: "Identifier", name }],
      types: [null],
      attrs: [null],
      values: [{ kind: "TableConstructor", fields: [] }],
    }),
  ];
  return rng.pick(forms)();
}

/**
 * Sprinkle opaque-predicate branches and dead locals through every block.
 * Insertion only ever happens *before* an existing statement, and only in
 * blocks that have no `goto`/label interaction to disturb.
 */
export function injectJunk(chunk: Chunk, rng: RNG, density = 0.35): number {
  let added = 0;
  let counter = 0;

  const process = (block: Statement[]): void => {
    for (let i = block.length - 1; i >= 0; i--) {
      const s = block[i];
      // never push a terminator out of last position
      if (
        s.kind === "ReturnStatement" ||
        s.kind === "BreakStatement" ||
        s.kind === "ContinueStatement"
      )
        continue;
      if (rng.float() > density) continue;

      const junk = junkStatement(rng, counter++);
      if (rng.bool(0.5)) {
        // Always wrapped in `do … end`. A bare `local` spliced in here can land
        // between a `goto` and the label it targets, and Lua rejects that as
        // "jumps into the scope of a local" — the whole chunk then fails to
        // compile. The wrapper keeps the junk name's scope inside itself.
        block.splice(i, 0, { kind: "DoStatement", body: [junk] });
      } else {
        block.splice(i, 0, {
          kind: "IfStatement",
          clauses: [{ cond: opaqueTrue(rng), body: [junkStatement(rng, counter++)] }],
          elseBody: [junk],
        });
      }
      added++;
    }
  };

  visit(chunk, {
    onStatement: (s) => {
      switch (s.kind) {
        case "DoStatement":
        case "WhileStatement":
        case "RepeatStatement":
        case "NumericForStatement":
        case "GenericForStatement":
        case "LocalFunctionStatement":
          process(s.body);
          break;
        case "FunctionStatement":
          process(s.body);
          break;
        case "IfStatement":
          s.clauses.forEach((c) => process(c.body));
          if (s.elseBody) process(s.elseBody);
          break;
        default:
          break;
      }
      return undefined;
    },
  });
  process(chunk.body);
  return added;
}
