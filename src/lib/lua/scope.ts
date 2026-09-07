/**
 * Lexical scope resolution.
 *
 * Every Identifier that refers to a local gets a link to its Declaration;
 * anything left unresolved is a global (or an implicit `self`). That link is
 * what makes renaming safe — the previous token-based renamer could not tell
 * `local count` in one function from a global `count` in another, which is how
 * scripts ended up broken.
 */

import type { Chunk, Declaration, Expression, Identifier, Statement } from "./ast.ts";

export interface Scope {
  parent: Scope | null;
  declarations: Map<string, Declaration>;
  /** true for function bodies (affects upvalue analysis) */
  isFunction: boolean;
}

export interface Resolution {
  scopes: Scope[];
  declarations: Declaration[];
  /** maps a statement block to the scope its statements declare into */
  scopeOfBlock: Map<Statement[], Scope>;
  /** every global name read or written anywhere in the chunk */
  globals: Set<string>;
  /** every label declared, with how many blocks declare that name */
  labelCounts: Map<string, number>;
}

let nextDeclId = 0;

function makeDecl(name: string, kind: Declaration["kind"]): Declaration {
  return { name, id: nextDeclId++, kind };
}

export function resolveScopes(chunk: Chunk): Resolution {
  const scopes: Scope[] = [];
  const declarations: Declaration[] = [];
  const globals = new Set<string>();
  const labelCounts = new Map<string, number>();

  const scopeOfBlock = new Map<Statement[], Scope>();
  const root: Scope = { parent: null, declarations: new Map(), isFunction: false };
  scopes.push(root);
  scopeOfBlock.set(chunk.body, root);

  const childScope = (parent: Scope, isFunction: boolean): Scope => {
    const s: Scope = { parent, declarations: new Map(), isFunction };
    scopes.push(s);
    return s;
  };

  /** child scope that also owns the given block (so it can be looked up later) */
  const blockScope = (parent: Scope, block: Statement[], isFunction = false): Scope => {
    const s = childScope(parent, isFunction);
    scopeOfBlock.set(block, s);
    return s;
  };

  const declare = (scope: Scope, name: string, kind: Declaration["kind"]): Declaration => {
    const existing = scope.declarations.get(name);
    if (existing) return existing;
    const d = makeDecl(name, kind);
    scope.declarations.set(name, d);
    declarations.push(d);
    return d;
  };

  const lookup = (scope: Scope, name: string): Declaration | null => {
    let s: Scope | null = scope;
    while (s) {
      const d = s.declarations.get(name);
      if (d) return d;
      s = s.parent;
    }
    return null;
  };

  const resolveExpr = (e: Expression, scope: Scope): void => {
    switch (e.kind) {
      case "Identifier":
        if (e.isProperty) return;
        {
          const d = lookup(scope, e.name);
          e.decl = d;
          if (!d) globals.add(e.name);
        }
        return;
      case "BinaryExpression":
        resolveExpr(e.left, scope);
        resolveExpr(e.right, scope);
        return;
      case "UnaryExpression":
        resolveExpr(e.arg, scope);
        return;
      case "CallExpression":
        resolveExpr(e.callee, scope);
        e.args.forEach((a) => resolveExpr(a, scope));
        return;
      case "MethodCallExpression":
        resolveExpr(e.base, scope);
        e.args.forEach((a) => resolveExpr(a, scope));
        return;
      case "IndexExpression":
        resolveExpr(e.base, scope);
        if (e.syntax === "[") resolveExpr(e.index, scope);
        return;
      case "TableConstructor":
        for (const f of e.fields) {
          if (f.keyKind === "expr" && f.key) resolveExpr(f.key as Expression, scope);
          resolveExpr(f.value, scope);
        }
        return;
      case "FunctionExpression":
        resolveFunction(e.params, e.body, e.isMethod ?? false, scope, blockScope);
        return;
      case "IfExpression":
        resolveExpr(e.cond, scope);
        resolveExpr(e.whenTrue, scope);
        resolveExpr(e.whenFalse, scope);
        return;
      case "TypeCast":
        resolveExpr(e.expr, scope);
        return;
      case "InterpolatedString":
        for (const p of e.parts) if (p.type === "expr") resolveExpr(p.expr, scope);
        return;
      default:
        return;
    }
  };

  const resolveFunction = (
    params: Identifier[],
    body: Statement[],
    isMethod: boolean,
    parent: Scope,
    mk: (p: Scope, b: Statement[], f: boolean) => Scope,
  ): void => {
    const fnScope = mk(parent, body, true);
    if (isMethod) declare(fnScope, "self", "param").keepName = true;
    for (const p of params) {
      p.decl = declare(fnScope, p.name, "param");
    }
    resolveBlock(body, fnScope);
  };

  const resolveBlock = (block: Statement[], scope: Scope): void => {
    for (const s of block) resolveStatement(s, scope);
  };

  const resolveStatement = (s: Statement, scope: Scope): void => {
    switch (s.kind) {
      case "LocalStatement": {
        // the right-hand side is evaluated before the names come into scope
        s.values.forEach((v) => resolveExpr(v, scope));
        s.names.forEach((n) => {
          n.decl = declare(scope, n.name, "local");
        });
        return;
      }
      case "LocalFunctionStatement": {
        // visible inside its own body, hence declared first
        s.name.decl = declare(scope, s.name.name, "function");
        resolveFunction(s.params, s.body, false, scope, blockScope);
        return;
      }
      case "FunctionStatement":
        resolveExpr(s.name, scope);
        resolveFunction(s.params, s.body, s.isMethod, scope, blockScope);
        return;
      case "AssignmentStatement":
        s.values.forEach((v) => resolveExpr(v, scope));
        s.targets.forEach((t) => resolveExpr(t, scope));
        return;
      case "CallStatement":
        resolveExpr(s.expr, scope);
        return;
      case "DoStatement": {
        const inner = blockScope(scope, s.body);
        resolveBlock(s.body, inner);
        return;
      }
      case "WhileStatement":
        resolveExpr(s.cond, scope);
        resolveBlock(s.body, blockScope(scope, s.body));
        return;
      case "RepeatStatement": {
        const inner = blockScope(scope, s.body);
        resolveBlock(s.body, inner);
        // `until` sees locals declared in the body
        resolveExpr(s.cond, inner);
        return;
      }
      case "IfStatement":
        for (const c of s.clauses) {
          resolveExpr(c.cond, scope);
          resolveBlock(c.body, blockScope(scope, c.body));
        }
        if (s.elseBody) resolveBlock(s.elseBody, blockScope(scope, s.elseBody));
        return;
      case "NumericForStatement": {
        resolveExpr(s.start, scope);
        resolveExpr(s.end, scope);
        if (s.step) resolveExpr(s.step, scope);
        const inner = blockScope(scope, s.body);
        s.variable.decl = declare(inner, s.variable.name, "for");
        resolveBlock(s.body, inner);
        return;
      }
      case "GenericForStatement": {
        s.iterators.forEach((v) => resolveExpr(v, scope));
        const inner = blockScope(scope, s.body);
        s.variables.forEach((v) => {
          v.decl = declare(inner, v.name, "for");
        });
        resolveBlock(s.body, inner);
        return;
      }
      case "ReturnStatement":
        s.values.forEach((v) => resolveExpr(v, scope));
        return;
      case "LabelStatement":
        labelCounts.set(s.label, (labelCounts.get(s.label) ?? 0) + 1);
        return;
      default:
        return;
    }
  };

  resolveBlock(chunk.body, root);
  return { scopes, declarations, globals, labelCounts, scopeOfBlock };
}
