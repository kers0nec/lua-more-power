/**
 * Control-flow flattening.
 *
 * A straight-line block
 *
 *     a()
 *     b()
 *     c()
 *
 * becomes a dispatcher loop whose states are visited in a shuffled order with
 * dead states mixed in:
 *
 *     local st = 41
 *     while st ~= 0 do
 *       if st == 7 then c() st = 0
 *       elseif st == 41 then a() st = 93
 *       …
 *       else st = 0 end
 *     end
 *
 * Two things make this safe rather than merely plausible:
 *
 *   1. Locals declared by the block are hoisted above the dispatcher and given
 *      fresh unique names, so a variable assigned in one state is still visible
 *      in the next — and a global reference that merely shares the old name is
 *      left alone.
 *   2. `break` / `continue` cannot be emitted inside the dispatcher (they would
 *      bind to the dispatcher loop), so they set a flag and are re-issued after
 *      the dispatcher, where they bind to the real loop.
 *
 * Blocks containing `goto`/labels or `<const>`/`<close>` attributes are left
 * untouched.
 */

import type { Chunk, Declaration, Identifier, Statement } from "./ast.ts";
import { visit } from "./walk.ts";
import type { Resolution } from "./scope.ts";
import { createNameGenerator, collectReservedNames } from "./transforms.ts";
import type { RNG } from "./rng.ts";

export interface FlattenOptions {
  /** 0..1 — share of eligible blocks that get flattened */
  density?: number;
  minStatements?: number;
  /** emit dead states into the dispatcher */
  junkStates?: boolean;
}

function containsGotoOrLabel(statements: Statement[]): boolean {
  for (const s of statements) {
    if (s.kind === "GotoStatement" || s.kind === "LabelStatement") return true;
    for (const block of nestedBlocks(s)) {
      if (containsGotoOrLabel(block)) return true;
    }
    if (s.kind === "FunctionStatement" && containsGotoOrLabel(s.body)) return true;
  }
  return false;
}

function nestedBlocks(s: Statement): Statement[][] {
  switch (s.kind) {
    case "DoStatement":
    case "WhileStatement":
    case "RepeatStatement":
    case "NumericForStatement":
    case "GenericForStatement":
    case "LocalFunctionStatement":
      return [s.body];
    case "IfStatement": {
      const blocks = s.clauses.map((c) => c.body);
      if (s.elseBody) blocks.push(s.elseBody);
      return blocks;
    }
    default:
      return [];
  }
}

function isLoopStatement(s: Statement): boolean {
  return (
    s.kind === "WhileStatement" ||
    s.kind === "RepeatStatement" ||
    s.kind === "NumericForStatement" ||
    s.kind === "GenericForStatement"
  );
}

/**
 * Look for `break` / `continue` that belong to the loop enclosing *this* block.
 * Descends through `do`/`if` but stops at nested loops (their exits belong to
 * the inner loop) and at function bodies (a different function's problem).
 */
function findOwnExits(statements: Statement[]): { brk: boolean; cont: boolean } {
  let brk = false;
  let cont = false;
  const walk = (list: Statement[]): void => {
    for (const s of list) {
      if (s.kind === "BreakStatement") brk = true;
      else if (s.kind === "ContinueStatement") cont = true;
      else if (isLoopStatement(s)) continue;
      else if (s.kind === "FunctionStatement" || s.kind === "LocalFunctionStatement") continue;
      else for (const b of nestedBlocks(s)) walk(b);
    }
  };
  walk(statements);
  return { brk, cont };
}

/**
 * Replace every own `break`/`continue` with a flag assignment. Same descent
 * rules as findOwnExits, so it never touches an inner loop's exit.
 */
function rewriteExits(statements: Statement[], breakFlag: string, continueFlag: string): boolean {
  let touched = false;
  for (let i = 0; i < statements.length; i++) {
    const s = statements[i];
    if (s.kind === "BreakStatement") {
      statements[i] = assignFlag(breakFlag);
      touched = true;
    } else if (s.kind === "ContinueStatement") {
      statements[i] = assignFlag(continueFlag);
      touched = true;
    } else if (isLoopStatement(s)) {
      continue;
    } else if (s.kind === "FunctionStatement" || s.kind === "LocalFunctionStatement") {
      continue;
    } else {
      for (const b of nestedBlocks(s)) {
        if (rewriteExits(b, breakFlag, continueFlag)) touched = true;
      }
    }
  }
  return touched;
}

function hasAttributes(statements: Statement[]): boolean {
  for (const s of statements) {
    if (s.kind === "LocalStatement" && s.attrs.some((a) => a !== null)) return true;
    for (const block of nestedBlocks(s)) {
      if (hasAttributes(block)) return true;
    }
    if (s.kind === "FunctionStatement" && hasAttributes(s.body)) return true;
  }
  return false;
}

export function flattenControlFlow(
  chunk: Chunk,
  resolution: Resolution,
  rng: RNG,
  options: FlattenOptions = {},
): { flattened: number; hoisted: number } {
  const density = options.density ?? 0.9;
  const minStatements = options.minStatements ?? 2;
  const junkStates = options.junkStates ?? true;

  const reserved = collectReservedNames(chunk, resolution.globals);
  const gen = createNameGenerator(rng, reserved);

  /** declarations hoisted out of a flattened block: decl id -> new name */
  const hoistRenames = new Map<number, string>();
  let flattened = 0;

  const processBlock = (block: Statement[], loopBody: boolean): void => {
    // depth-first: nested blocks first so their flattening is already done
    for (const s of block) processStatement(s);

    if (block.length < minStatements) return;
    if (containsGotoOrLabel(block)) return;
    if (hasAttributes(block)) return;

    const exits = findOwnExits(block);
    if (exits.brk || exits.cont) {
      // inside a loop we can re-issue them after the dispatcher; anywhere else
      // (a `do` block, an `if` arm) there is nowhere to put them
      if (!loopBody) return;
    }
    if (rng.float() > density) return;

    const needsBreak = loopBody && exits.brk;
    const needsContinue = loopBody && exits.cont;

    // fresh, collision-free names for this dispatcher's own locals
    const STATE = gen();
    const BREAK_FLAG = gen();
    const CONTINUE_FLAG = gen();

    // 1. hoist the locals *this block declares* above the dispatcher.
    //    Only names bound by a `local`/`local function` statement in the block
    //    itself qualify: parameters, loop variables and the implicit `self`
    //    are declared by a header, so their references must keep their name.
    const hoisted: Statement[] = [];
    const rewritten: { stmts: Statement[]; guarded: boolean }[] = [];
    const hoistName = (n: Identifier): string | undefined => {
      if (!n.decl || n.decl.keepName) return undefined;
      const known = hoistRenames.get(n.decl.id);
      if (known) return known;
      const fresh = gen();
      hoistRenames.set(n.decl.id, fresh);
      hoisted.push({
        kind: "LocalStatement",
        names: [ident(fresh)],
        types: [null],
        attrs: [null],
        values: [],
      });
      return fresh;
    };
    for (const s of block) {
      if (s.kind === "LocalStatement") s.names.forEach(hoistName);
      else if (s.kind === "LocalFunctionStatement") hoistName(s.name);
    }

    for (const s of block) {
      const r = rewriteDeclaration(s, hoistRenames);
      if (r === null) continue;
      const stmts = Array.isArray(r) ? [...r] : [r];
      const guarded =
        needsBreak || needsContinue
          ? rewriteExits(stmts, needsBreak ? BREAK_FLAG : "", needsContinue ? CONTINUE_FLAG : "")
          : false;
      rewritten.push({ stmts, guarded });
    }

    // 2. build the state machine: one state per statement, wired in order,
    //    then presented to the dispatcher in a shuffled order.
    const usedIds = new Set<number>([0]);
    const alloc = (): number => {
      let id = rng.range(1, 99999);
      while (usedIds.has(id)) id = rng.range(1, 99999);
      usedIds.add(id);
      return id;
    };

    const ids = rewritten.map(() => alloc());
    const anyFlag = needsContinue
      ? {
          kind: "BinaryExpression" as const,
          op: "or" as const,
          left: flagRef(BREAK_FLAG),
          right: flagRef(CONTINUE_FLAG),
        }
      : flagRef(BREAK_FLAG);

    const states = rewritten.map((r, i): { id: number; body: Statement[] } => {
      const id = ids[i];
      const next = i + 1 < ids.length ? ids[i + 1] : 0;
      const body: Statement[] = [...r.stmts];
      const exitsBlock =
        r.stmts.length === 1 &&
        r.stmts[0].kind === "DoStatement" &&
        r.stmts[0].body.length === 1 &&
        r.stmts[0].body[0].kind === "ReturnStatement";
      if (r.guarded) {
        // the flag may have been raised: leave the dispatcher instead of
        // walking on to the next state
        body.push({
          kind: "IfStatement",
          clauses: [{ cond: anyFlag, body: [setState(STATE, 0)] }],
          elseBody: [setState(STATE, next)],
        });
      } else if (!exitsBlock) {
        body.push(setState(STATE, next));
      }
      if (r.stmts.length === 1 && r.stmts[0].kind === "ReturnStatement") {
        // `do return … end` is a legal non-final statement and still a tail call
        body[0] = { kind: "DoStatement", body: [r.stmts[0]] };
      }
      return { id, body };
    });

    const entry = ids.length > 0 ? ids[0] : 0;
    const order = [...states];
    rng.shuffle(order);

    if (junkStates) {
      // unreachable states: nothing ever sets `st` to them
      for (let i = 0; i < Math.min(3, order.length); i++) {
        const target = rng.pick(states).id;
        order.splice(rng.int(order.length + 1), 0, makeJunkState(alloc, rng, gen, target, STATE));
      }
    }

    const clauses = order.map((st) => ({
      cond: stateEquals(STATE, st.id),
      body: st.body,
    }));

    const dispatcher: Statement = {
      kind: "WhileStatement",
      cond: {
        kind: "BinaryExpression",
        op: "~=",
        left: stateVar(STATE),
        right: num(0),
      },
      body: [
        {
          kind: "IfStatement",
          clauses,
          elseBody: [setState(STATE, 0)],
        },
      ],
    };

    const out: Statement[] = [
      ...hoisted,
      {
        kind: "LocalStatement",
        names: [ident(STATE)],
        types: [null],
        attrs: [null],
        values: [num(entry)],
      },
    ];
    if (needsBreak) out.push(flagDecl(BREAK_FLAG));
    if (needsContinue) out.push(flagDecl(CONTINUE_FLAG));
    out.push(dispatcher);
    if (needsBreak) {
      out.push({
        kind: "IfStatement",
        clauses: [{ cond: flagRef(BREAK_FLAG), body: [{ kind: "BreakStatement" }] }],
        elseBody: null,
      });
    }
    if (needsContinue) {
      out.push({
        kind: "IfStatement",
        clauses: [{ cond: flagRef(CONTINUE_FLAG), body: [{ kind: "ContinueStatement" }] }],
        elseBody: null,
      });
    }

    block.length = 0;
    block.push(...out);
    flattened++;
  };

  const processStatement = (s: Statement): void => {
    switch (s.kind) {
      case "DoStatement":
        processBlock(s.body, false);
        return;
      case "WhileStatement":
        processBlock(s.body, true);
        return;
      case "RepeatStatement":
        processBlock(s.body, true);
        return;
      case "NumericForStatement":
      case "GenericForStatement":
        processBlock(s.body, true);
        return;
      case "LocalFunctionStatement":
        processBlock(s.body, false);
        return;
      case "FunctionStatement":
        processBlock(s.body, false);
        return;
      case "IfStatement":
        for (const c of s.clauses) {
          processBlock(c.body, false);
        }
        if (s.elseBody) processBlock(s.elseBody, false);
        return;
      default:
        return;
    }
  };

  processBlock(chunk.body, false);

  // 3. apply the hoist renames everywhere
  if (hoistRenames.size > 0) {
    const applyRename = (id: Identifier): void => {
      if (!id.decl || id.isProperty) return;
      const fresh = hoistRenames.get(id.decl.id);
      if (fresh) id.name = fresh;
    };
    visit(chunk, {
      onExpression: (e) => {
        if (e.kind === "Identifier") applyRename(e);
        return undefined;
      },
    });
  }

  return { flattened, hoisted: hoistRenames.size };
}

/* ------------------------------------------------------------- helpers */

function num(n: number) {
  return { kind: "NumericLiteral" as const, value: n, raw: String(n), isInteger: true };
}
function ident(name: string): Identifier {
  return { kind: "Identifier", name };
}
function stateVar(name: string): Identifier {
  return ident(name);
}
function stateEquals(name: string, id: number) {
  return { kind: "BinaryExpression" as const, op: "==", left: stateVar(name), right: num(id) };
}
function setState(name: string, id: number): Statement {
  return { kind: "AssignmentStatement", targets: [stateVar(name)], values: [num(id)] };
}
function flagDecl(name: string): Statement {
  return {
    kind: "LocalStatement",
    names: [ident(name)],
    types: [null],
    attrs: [null],
    values: [{ kind: "BooleanLiteral", value: false }],
  };
}
function flagRef(name: string) {
  return ident(name);
}
function assignFlag(name: string): Statement {
  return {
    kind: "AssignmentStatement",
    targets: [ident(name)],
    values: [{ kind: "BooleanLiteral", value: true }],
  };
}

function makeJunkState(
  alloc: () => number,
  rng: RNG,
  gen: () => string,
  target: number,
  stateName: string,
): { id: number; body: Statement[] } {
  const name = `_${gen().slice(1)}`;
  const a = rng.range(2, 999);
  return {
    id: alloc(),
    body: [
      {
        kind: "LocalStatement",
        names: [ident(name)],
        types: [null],
        attrs: [null],
        values: [
          {
            kind: "BinaryExpression",
            op: "%",
            left: {
              kind: "BinaryExpression",
              op: "+",
              left: {
                kind: "BinaryExpression",
                op: "*",
                left: num(a),
                right: num(a),
              },
              right: num(a),
            },
            right: num(2),
          },
        ],
      },
      setState(stateName, target),
    ],
  };
}

/**
 * Turn `local a, b = f()` into `a, b = f()` (and `local function f` into
 * `f = function`), using the hoisted names. Returns null to drop the statement.
 */
function rewriteDeclaration(
  s: Statement,
  hoistRenames: Map<number, string>,
): Statement | Statement[] | null {
  if (s.kind === "LocalStatement") {
    const mapped = s.names.map((n) => (n.decl ? hoistRenames.get(n.decl.id) : undefined));
    if (mapped.every((m) => m === undefined)) return s;
    if (s.values.length === 0) return null;
    const targets: Identifier[] = s.names.map((n, i) => ident(mapped[i] ?? n.name));
    return { kind: "AssignmentStatement", targets, values: s.values };
  }
  if (s.kind === "LocalFunctionStatement") {
    const mapped = s.name.decl ? hoistRenames.get(s.name.decl.id) : undefined;
    if (!mapped) return s;
    return {
      kind: "AssignmentStatement",
      targets: [ident(mapped)],
      values: [
        {
          kind: "FunctionExpression",
          isVararg: s.isVararg,
          params: s.params,
          paramTypes: s.paramTypes,
          returnType: s.returnType,
          generics: s.generics,
          body: s.body,
        },
      ],
    };
  }
  return s;
}

export type { Declaration };
