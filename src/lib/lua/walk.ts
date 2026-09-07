/**
 * Generic AST traversal.
 *
 * `visit` walks every node and calls `onExpression` / `onStatement` for each.
 * Handlers may return a replacement node (or `null` to delete a statement),
 * which is what makes the transforms composable.
 */

import type { Chunk, Expression, Identifier, Statement, TableField, TypeNode } from "./ast.ts";

/** Expressions embedded in Luau type annotations (`typeof(x)`). */
function typeExpressions(t: TypeNode | null | undefined): Expression[] {
  if (!t) return [];
  switch (t.kind) {
    case "TTypeof":
      return [t.expr];
    case "TName":
      return t.generics.flatMap(typeExpressions);
    case "TTable":
      return t.fields.flatMap((f) => [
        ...(typeof f.key === "object" && f.key !== null ? typeExpressions(f.key as TypeNode) : []),
        ...typeExpressions(f.value),
      ]);
    case "TFunction":
      return [
        ...t.params.flatMap((p) => typeExpressions(p.type)),
        ...t.returns.flatMap(typeExpressions),
      ];
    case "TUnion":
    case "TIntersection":
      return t.parts.flatMap(typeExpressions);
    default:
      return [];
  }
}

export interface Visitors {
  /** return a replacement expression, or undefined to keep the original */
  onExpression?: (expr: Expression, parent: Node | null) => Expression | void;
  /** return a replacement statement, `null` to drop it, or undefined to keep */
  onStatement?: (stmt: Statement, parent: Node | null) => Statement | null | void;
}

export type Node = Chunk | Statement | Expression;

/** Expression slots of every statement kind. */
function statementExpressionSlots(
  s: Statement,
): Array<{ get(): Expression; set(v: Expression): void }> {
  switch (s.kind) {
    case "LocalStatement":
      return s.values.map((_, i) => ({
        get: () => s.values[i],
        set: (v: Expression) => void (s.values[i] = v),
      }));
    case "AssignmentStatement":
      return [
        ...s.targets.map((_, i) => ({
          get: () => s.targets[i],
          set: (v: Expression) => void (s.targets[i] = v),
        })),
        ...s.values.map((_, i) => ({
          get: () => s.values[i],
          set: (v: Expression) => void (s.values[i] = v),
        })),
      ];
    case "CallStatement":
      return [{ get: () => s.expr, set: (v: Expression) => void (s.expr = v as typeof s.expr) }];
    case "WhileStatement":
      return [{ get: () => s.cond, set: (v: Expression) => void (s.cond = v) }];
    case "RepeatStatement":
      return [{ get: () => s.cond, set: (v: Expression) => void (s.cond = v) }];
    case "IfStatement":
      return s.clauses.map((c) => ({
        get: () => c.cond,
        set: (v: Expression) => void (c.cond = v),
      }));
    case "NumericForStatement": {
      const slots = [
        { get: () => s.start, set: (v: Expression) => void (s.start = v) },
        { get: () => s.end, set: (v: Expression) => void (s.end = v) },
      ];
      if (s.step) slots.push({ get: () => s.step!, set: (v: Expression) => void (s.step = v) });
      return slots;
    }
    case "GenericForStatement":
      return s.iterators.map((_, i) => ({
        get: () => s.iterators[i],
        set: (v: Expression) => void (s.iterators[i] = v),
      }));
    case "FunctionStatement":
      return [{ get: () => s.name, set: (v: Expression) => void (s.name = v) }];
    case "ReturnStatement":
      return s.values.map((_, i) => ({
        get: () => s.values[i],
        set: (v: Expression) => void (s.values[i] = v),
      }));
    default:
      return [];
  }
}

function expressionChildren(e: Expression): Array<{ get(): Expression; set(v: Expression): void }> {
  switch (e.kind) {
    case "BinaryExpression":
      return [
        { get: () => e.left, set: (v: Expression) => void (e.left = v) },
        { get: () => e.right, set: (v: Expression) => void (e.right = v) },
      ];
    case "UnaryExpression":
      return [{ get: () => e.arg, set: (v: Expression) => void (e.arg = v) }];
    case "CallExpression":
      return [
        { get: () => e.callee, set: (v: Expression) => void (e.callee = v) },
        ...e.args.map((_, i) => ({
          get: () => e.args[i],
          set: (v: Expression) => void (e.args[i] = v),
        })),
      ];
    case "MethodCallExpression":
      return [
        { get: () => e.base, set: (v: Expression) => void (e.base = v) },
        ...e.args.map((_, i) => ({
          get: () => e.args[i],
          set: (v: Expression) => void (e.args[i] = v),
        })),
      ];
    case "IndexExpression":
      return [
        { get: () => e.base, set: (v: Expression) => void (e.base = v) },
        ...(e.syntax === "["
          ? [{ get: () => e.index, set: (v: Expression) => void (e.index = v) }]
          : []),
      ];
    case "TableConstructor":
      return e.fields.map((f: TableField, i) => ({
        get: () => (f.keyKind === "expr" ? (f.key as Expression) : f.value),
        set: (v: Expression) => {
          if (f.keyKind === "expr") f.key = v;
          else e.fields[i].value = v;
        },
      }));
    case "IfExpression":
      return [
        { get: () => e.cond, set: (v: Expression) => void (e.cond = v) },
        { get: () => e.whenTrue, set: (v: Expression) => void (e.whenTrue = v) },
        { get: () => e.whenFalse, set: (v: Expression) => void (e.whenFalse = v) },
      ];
    case "TypeCast":
      return [{ get: () => e.expr, set: (v: Expression) => void (e.expr = v) }];
    case "InterpolatedString":
      return e.parts.flatMap((p, i) =>
        p.type === "expr"
          ? [
              {
                get: () => (e.parts[i] as { expr: Expression }).expr,
                set: (v: Expression) => void ((e.parts[i] as { expr: Expression }).expr = v),
              },
            ]
          : [],
      );
    default:
      return [];
  }
}

/** Statements nested inside a statement. */
function statementBlocks(s: Statement): Statement[][] {
  switch (s.kind) {
    case "DoStatement":
      return [s.body];
    case "WhileStatement":
      return [s.body];
    case "RepeatStatement":
      return [s.body];
    case "NumericForStatement":
      return [s.body];
    case "GenericForStatement":
      return [s.body];
    case "IfStatement": {
      const blocks = s.clauses.map((c) => c.body);
      if (s.elseBody) blocks.push(s.elseBody);
      return blocks;
    }
    case "LocalFunctionStatement":
      return [s.body];
    default:
      return [];
  }
}

/** FunctionExpression bodies nested in expressions are handled by visitExpression. */
export function visit(chunk: Chunk, visitors: Visitors): void {
  visitBlock(chunk.body, chunk, visitors);
}

function visitBlock(block: Statement[], parent: Node, visitors: Visitors): void {
  for (let i = 0; i < block.length; i++) {
    const s = block[i];
    visitStatement(s, parent, visitors);
    if (visitors.onStatement) {
      const replacement = visitors.onStatement(s, parent);
      if (replacement === null) {
        block.splice(i, 1);
        i--;
        continue;
      }
      if (replacement !== undefined && replacement !== s) {
        block[i] = replacement;
      }
    }
  }
}

/** Identifiers that *declare* a local (declaration sites need renaming too). */
function declarationIdentifiers(s: Statement): Identifier[] {
  switch (s.kind) {
    case "LocalStatement":
      return s.names;
    case "LocalFunctionStatement":
      return [s.name, ...s.params];
    case "FunctionStatement":
      return s.params;
    case "NumericForStatement":
      return [s.variable];
    case "GenericForStatement":
      return s.variables;
    default:
      return [];
  }
}

/** Types attached to a statement (`local x: T`, params, return types, aliases). */
function statementTypes(s: Statement): Array<TypeNode | null | undefined> {
  switch (s.kind) {
    case "LocalStatement":
      return s.types;
    case "GenericForStatement":
      return s.types;
    case "LocalFunctionStatement":
    case "FunctionStatement":
      return [...s.paramTypes, s.returnType];
    case "TypeAliasStatement":
      return [s.type];
    default:
      return [];
  }
}

function visitStatement(s: Statement, parent: Node, visitors: Visitors): void {
  for (const t of statementTypes(s)) {
    for (const e of typeExpressions(t)) visitExpression(e, s, visitors);
  }
  for (const id of declarationIdentifiers(s)) {
    if (visitors.onExpression) {
      const r = visitors.onExpression(id, s);
      if (r && r.kind === "Identifier") Object.assign(id, r);
    }
  }
  for (const slot of statementExpressionSlots(s)) {
    const e = slot.get();
    if (!e) continue;
    const replaced = visitExpression(e, s, visitors);
    if (replaced !== e) slot.set(replaced);
  }
  for (const block of statementBlocks(s)) visitBlock(block, s, visitors);

  // `function a.b.c()` keeps its body on the statement itself
  if (s.kind === "FunctionStatement") visitBlock(s.body, s, visitors);
}

function visitExpression(e: Expression, parent: Node, visitors: Visitors): Expression {
  let current = e;
  if (current.kind === "FunctionExpression") {
    for (const id of current.params) {
      if (visitors.onExpression) {
        const r = visitors.onExpression(id, current);
        if (r && r.kind === "Identifier") Object.assign(id, r);
      }
    }
    visitBlock(current.body, current, visitors);
  }
  if (current.kind === "FunctionExpression") {
    for (const t of [...current.paramTypes, current.returnType]) {
      for (const e of typeExpressions(t)) visitExpression(e, current, visitors);
    }
  }
  if (current.kind === "TypeCast") {
    for (const e of typeExpressions(current.type)) visitExpression(e, current, visitors);
  }
  for (const slot of expressionChildren(current)) {
    const child = slot.get();
    if (!child) continue;
    const replaced = visitExpression(child, current, visitors);
    if (replaced !== child) slot.set(replaced);
  }
  if (visitors.onExpression) {
    const r = visitors.onExpression(current, parent);
    if (r) current = r;
  }
  return current;
}
