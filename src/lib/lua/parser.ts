/**
 * Recursive-descent parser for Lua 5.1 – 5.4 and Luau.
 *
 * It produces a full AST (see ./ast.ts) and, crucially, records where the
 * source had explicit parentheses so the emitter can reproduce them exactly.
 * When the input contains anything this parser does not understand it throws
 * a ParseError — the obfuscation pipeline catches that and returns the
 * original source untouched rather than risking a broken build.
 */

import { lex, LUA_KEYWORDS, LUAU_CONTEXTUAL, type Token } from "./lexer.ts";
import type {
  Chunk,
  Expression,
  FunctionExpression,
  Identifier,
  Statement,
  TableField,
  TypeNode,
} from "./ast.ts";

export class ParseError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(`${message} (line ${line})`);
    this.name = "ParseError";
    this.line = line;
  }
}

const BINARY_PRIORITY: Record<string, [number, number]> = {
  "+": [10, 10],
  "-": [10, 10],
  "*": [11, 11],
  "%": [11, 11],
  "/": [11, 11],
  "//": [11, 11],
  "^": [14, 13],
  "&": [6, 6],
  "|": [4, 4],
  "~": [5, 5],
  "<<": [7, 7],
  ">>": [7, 7],
  "..": [9, 8],
  "==": [3, 3],
  "~=": [3, 3],
  "<": [3, 3],
  ">": [3, 3],
  "<=": [3, 3],
  ">=": [3, 3],
  and: [2, 2],
  or: [1, 1],
};
const UNARY_PRIORITY = 12;

export function parse(source: string): Chunk {
  return createParser(source).parseChunk();
}

function createParser(source: string) {
  const { tokens, prologue } = lex(source);
  let pos = 0;

  const peek = (offset = 0): Token => tokens[Math.min(pos + offset, tokens.length - 1)];
  const is = (value: string, offset = 0): boolean => {
    const t = peek(offset);
    // structural tokens only: a string literal whose value happens to be "#",
    // "and", "=" … must never be mistaken for an operator or punctuation
    return (t.type === "punct" || t.type === "keyword") && t.value === value;
  };
  const isType = (type: Token["type"], offset = 0): boolean => peek(offset).type === type;
  const fail = (msg: string): never => {
    throw new ParseError(msg, peek().line);
  };
  const next = (): Token => tokens[pos++];
  const expect = (value: string): Token => {
    if (!is(value)) fail(`expected '${value}' but found '${peek().value}'`);
    return next();
  };
  const accept = (value: string): boolean => {
    if (is(value)) {
      pos++;
      return true;
    }
    return false;
  };

  const markParen = <T extends Expression>(e: T): T => {
    e.paren = true;
    return e;
  };

  /* ------------------------------------------------------------- types */

  function parseTypeList(sep: string): TypeNode[] {
    const list: TypeNode[] = [];
    do {
      list.push(parseType());
    } while (accept(sep));
    return list;
  }

  function parseType(): TypeNode {
    let t = parseIntersectionType();
    if (is("|")) {
      const parts = [t];
      while (accept("|")) parts.push(parseIntersectionType());
      t = { kind: "TUnion", parts };
    }
    return t;
  }

  function parseIntersectionType(): TypeNode {
    let t = parseSimpleType();
    if (accept("?")) t = { kind: "TUnion", parts: [t, { kind: "TNil" }] };
    if (is("&")) {
      const parts = [t];
      while (accept("&")) parts.push(parseSimpleType());
      t = { kind: "TIntersection", parts };
    }
    return t;
  }

  function parseGenericTypeList(): string[] {
    expect("<");
    const names: string[] = [];
    do {
      if (!isType("name")) fail("expected generic parameter name");
      names.push(next().value);
      // default type parameters (`<T = number>`) — skip them verbatim
      if (accept("=")) parseType();
    } while (accept(","));
    expect(">");
    return names;
  }

  function parseSimpleType(): TypeNode {
    // function types: `(...) -> T`  or  `(a: T, ...) -> T`
    if (is("(")) {
      const save = pos;
      try {
        const fn = tryParseFunctionType();
        if (fn) return fn;
      } catch {
        /* fall through to grouped type */
      }
      pos = save;
      expect("(");
      const inner = parseType();
      expect(")");
      return inner;
    }

    if (is("{")) return parseTableType();

    if (is("...")) {
      next();
      return { kind: "TVariadic" };
    }

    if (peek().value === "typeof" && peek().type === "name") {
      next();
      expect("(");
      const expr = parseExpr();
      expect(")");
      return { kind: "TTypeof", expr };
    }

    const t = peek();
    if (t.type === "number") {
      next();
      return { kind: "TSingleton", value: Number(t.value) };
    }
    if (t.type === "string") {
      next();
      return { kind: "TString", value: t.value };
    }
    if (t.value === "nil") {
      next();
      return { kind: "TNil" };
    }
    if (t.value === "true" || t.value === "false") {
      next();
      return { kind: "TBoolean", value: t.value === "true" };
    }
    if (t.value === "-") {
      next();
      const num = peek();
      if (num.type !== "number") fail("expected number after '-' in type");
      next();
      return { kind: "TSingleton", negative: true, value: Number(num.value) };
    }
    if (t.type === "name") {
      next();
      const generics: TypeNode[] = [];
      if (is("<")) {
        expect("<");
        do {
          generics.push(parseType());
        } while (accept(","));
        expect(">");
      }
      return { kind: "TName", name: t.value, generics };
    }

    return fail(`unexpected '${t.value}' in type annotation`);
  }

  function tryParseFunctionType(): TypeNode | null {
    expect("(");
    const params: Array<{ name?: string; type: TypeNode; variadic?: boolean }> = [];
    let generics: string[] = [];
    if (is("<")) generics = parseGenericTypeList();
    if (!is(")")) {
      do {
        if (is("...")) {
          next();
          accept(":");
          const type = is(")") ? { kind: "TAny" as const } : parseType();
          params.push({ type, variadic: true });
          break;
        }
        // `name: Type` or bare `Type`
        if (isType("name", 0) && is(":", 1)) {
          const name = next().value;
          next();
          params.push({ name, type: parseType() });
        } else {
          params.push({ type: parseType() });
        }
      } while (accept(","));
    }
    expect(")");
    if (!is("->")) return null;
    next();
    // Multi-returns are always parenthesised (`-> (A, B)`); parsing a plain
    // comma list here would eat the separator of an enclosing parameter list.
    const returns: TypeNode[] = [is("(") ? parseFunctionReturnGroup() : parseType()];
    return { kind: "TFunction", generics, params, returns };
  }

  function parseFunctionReturnGroup(): TypeNode {
    // `(A, B)` return group in a function type; `()` means "returns nothing"
    const save = pos;
    expect("(");
    if (accept(")")) return { kind: "TNone" };
    const parts = [parseType()];
    while (accept(",")) parts.push(parseType());
    if (accept(")")) {
      if (parts.length === 1) return parts[0];
      return { kind: "TIntersection", parts };
    }
    pos = save;
    return parseType();
  }

  function parseTableType(): TypeNode {
    expect("{");
    const fields: Array<{
      key?: TypeNode | string;
      keyIsName?: boolean;
      value: TypeNode;
      readOnly?: boolean;
    }> = [];
    while (!is("}") && !isType("eof")) {
      let readOnly = false;
      if (
        peek().value === "read" &&
        peek().type === "name" &&
        (is(":", 1) || isType("name", 1) || is("[", 1))
      ) {
        readOnly = true;
        next();
      }
      if (is("[")) {
        next();
        const key = parseType();
        expect("]");
        expect(":");
        fields.push({ key, value: parseType(), readOnly });
      } else if (isType("name") && is(":", 1)) {
        const key = next().value;
        accept("?");
        expect(":");
        fields.push({ key, keyIsName: true, value: parseType(), readOnly });
      } else {
        // index type shorthand: `{T}` (Luau array shorthand)
        const value = parseType();
        fields.push({ value, readOnly });
      }
      if (!accept(",") && !accept(";")) break;
    }
    expect("}");
    return { kind: "TTable", fields };
  }

  /* -------------------------------------------------------- expressions */

  function parseExpr(limit = 0): Expression {
    let expr = parseUnary();
    while (true) {
      const t = peek();
      const prio = BINARY_PRIORITY[t.value];
      if (!prio || prio[0] <= limit) break;
      next();
      const right = parseExpr(prio[1]);
      expr = { kind: "BinaryExpression", op: t.value, left: expr, right };
    }
    // Luau cast: `expr :: Type`
    if (is("::") && isCastPosition()) {
      next();
      const type = parseType();
      expr = { kind: "TypeCast", expr, type };
    }
    return expr;
  }

  /** `::` after a complete expression is a Luau type cast, not a label. */
  function isCastPosition(): boolean {
    const t = peek(1);
    // `::name::` is a label statement that happens to follow an expression
    if (t.type === "name" && is("::", 2)) return false;
    return t.type === "name" || ["nil", "typeof", "(", "{", "..."].includes(t.value);
  }

  function parseUnary(): Expression {
    const t = peek();
    if ((t.type === "punct" || t.type === "keyword") && ["-", "not", "#", "~"].includes(t.value)) {
      next();
      const arg = parseExpr(UNARY_PRIORITY);
      return { kind: "UnaryExpression", op: t.value, arg };
    }
    return parseSimpleExpr();
  }

  function parseSimpleExpr(): Expression {
    const t = peek();

    if (t.type === "number") {
      next();
      const value = Number(t.value.replace(/(ull|ll)$/i, ""));
      return {
        kind: "NumericLiteral",
        value: Number.isFinite(value) ? value : 0,
        raw: t.value,
        isInteger: t.isInteger ?? false,
        suffix: t.suffix,
      };
    }
    if (t.type === "string") {
      next();
      return { kind: "StringLiteral", bytes: t.value, raw: t.raw };
    }
    if (t.type === "interpstring") {
      next();
      const parts = (t.interp ?? []).map((p) =>
        p.type === "text"
          ? { type: "text" as const, bytes: p.bytes }
          : { type: "expr" as const, expr: parseSubExpr(p.src) },
      );
      return { kind: "InterpolatedString", parts };
    }
    if (t.value === "nil") {
      next();
      return { kind: "NilLiteral" };
    }
    if (t.value === "true" || t.value === "false") {
      next();
      return { kind: "BooleanLiteral", value: t.value === "true" };
    }
    if (t.value === "...") {
      next();
      return { kind: "VarargLiteral" };
    }
    if (t.value === "{") return parseTableConstructor();
    if (t.value === "function") {
      next();
      return parseFunctionBody(false);
    }
    // Luau if-expression: `if cond then a else b`
    if (t.value === "if") {
      next();
      const cond = parseExpr();
      expect("then");
      const whenTrue = parseExpr();
      let whenFalse: Expression;
      if (accept("elseif")) {
        const elifCond = parseExpr();
        expect("then");
        const elifTrue = parseExpr();
        expect("else");
        const elifFalse = parseExpr();
        whenFalse = {
          kind: "IfExpression",
          cond: elifCond,
          whenTrue: elifTrue,
          whenFalse: elifFalse,
        };
      } else {
        expect("else");
        whenFalse = parseExpr();
      }
      return { kind: "IfExpression", cond, whenTrue, whenFalse };
    }
    return parsePrefixExpr();
  }

  /** Parse an expression out of a nested source slice (interpolated string parts). */
  function parseSubExpr(src: string): Expression {
    return createParser(src).parseExpression();
  }

  function parseTableConstructor(): Expression {
    expect("{");
    const fields: TableField[] = [];
    while (!is("}")) {
      if (is("[")) {
        next();
        const key = parseExpr();
        expect("]");
        expect("=");
        fields.push({ keyKind: "expr", key, value: parseExpr() });
      } else if (isType("name") && is("=", 1)) {
        const name = next().value;
        next();
        fields.push({ keyKind: "name", key: name, value: parseExpr() });
      } else {
        fields.push({ keyKind: "value", value: parseExpr() });
      }
      if (!accept(",") && !accept(";")) break;
    }
    expect("}");
    return { kind: "TableConstructor", fields };
  }

  function parseArgs(): Expression[] {
    if (is("(")) {
      next();
      const args: Expression[] = [];
      if (!is(")")) {
        do {
          args.push(parseExpr());
        } while (accept(","));
      }
      expect(")");
      return args;
    }
    if (isType("string")) {
      const t = next();
      return [{ kind: "StringLiteral", bytes: t.value, raw: t.raw }];
    }
    if (is("{")) return [parseTableConstructor()];
    return fail("function arguments expected");
  }

  function parsePrefixExpr(): Expression {
    let expr: Expression;
    if (is("(")) {
      next();
      const inner = parseExpr();
      expect(")");
      expr = markParen(inner);
    } else if (isType("name")) {
      const t = next();
      expr = { kind: "Identifier", name: t.value };
    } else {
      return fail(`unexpected symbol '${peek().value}'`);
    }

    while (true) {
      if (is(".")) {
        next();
        if (!isType("name")) fail("expected property name after '.'");
        const name = next().value;
        expr = {
          kind: "IndexExpression",
          base: expr,
          index: { kind: "Identifier", name, isProperty: true },
          syntax: ".",
        };
      } else if (is("[")) {
        next();
        const index = parseExpr();
        expect("]");
        expr = { kind: "IndexExpression", base: expr, index, syntax: "[" };
      } else if (is(":")) {
        next();
        if (!isType("name")) fail("expected method name after ':'");
        const t = next();
        const args = parseArgs();
        expr = {
          kind: "MethodCallExpression",
          base: expr,
          method: { kind: "Identifier", name: t.value, isProperty: true },
          args,
        };
      } else if (is("(") || isType("string") || is("{")) {
        const args = parseArgs();
        expr = { kind: "CallExpression", callee: expr, args };
      } else {
        break;
      }
    }
    return expr;
  }

  function parseExprList(): Expression[] {
    const list = [parseExpr()];
    while (accept(",")) list.push(parseExpr());
    return list;
  }

  /* --------------------------------------------------------- statements */

  function parseParamList(): {
    params: Identifier[];
    types: Array<TypeNode | null>;
    isVararg: boolean;
  } {
    const params: Identifier[] = [];
    const types: Array<TypeNode | null> = [];
    let isVararg = false;
    if (!is(")")) {
      while (true) {
        if (is("...")) {
          isVararg = true;
          next();
          if (accept(":")) {
            try {
              parseType();
            } catch {
              /* variadic type annotation is optional and unimportant */
            }
          }
          break;
        }
        if (!isType("name")) fail("expected parameter name");
        const t = next();
        params.push({ kind: "Identifier", name: t.value });
        let type: TypeNode | null = null;
        if (accept(":")) type = parseType();
        types.push(type);
        if (!accept(",")) break;
      }
    }
    expect(")");
    return { params, types, isVararg };
  }

  function parseFunctionBody(isMethod: boolean): FunctionExpression {
    const generics = is("<") ? parseGenericTypeList() : [];
    expect("(");
    const { params, types, isVararg } = parseParamList();
    let returnType: TypeNode | null = null;
    if (accept(":")) returnType = parseType();
    const body = parseBlock();
    expect("end");
    return {
      kind: "FunctionExpression",
      isVararg,
      params,
      paramTypes: types,
      returnType,
      generics,
      body,
      isMethod,
    };
  }

  function startsBlockEnd(): boolean {
    const t = peek();
    return t.type === "eof" || ["end", "else", "elseif", "until"].includes(t.value);
  }

  function parseBlock(): Statement[] {
    const body: Statement[] = [];
    while (!startsBlockEnd()) {
      const s = parseStatement();
      if (s) body.push(s);
      if (
        s &&
        (s.kind === "ReturnStatement" ||
          s.kind === "BreakStatement" ||
          s.kind === "ContinueStatement")
      ) {
        accept(";");
        break;
      }
    }
    return body;
  }

  function parseStatement(): Statement | null {
    if (accept(";")) return null;

    // Luau label `::name::`
    if (is("::")) {
      next();
      if (!isType("name")) fail("expected label name");
      const label = next().value;
      expect("::");
      return { kind: "LabelStatement", label };
    }

    const t = peek();

    if (t.value === "break") {
      next();
      return { kind: "BreakStatement" };
    }
    if (t.value === "return") {
      next();
      const values: Expression[] = [];
      if (!startsBlockEnd() && !is(";")) values.push(...parseExprList());
      return { kind: "ReturnStatement", values };
    }
    if (t.value === "goto") {
      next();
      if (!isType("name")) fail("expected goto label");
      return { kind: "GotoStatement", label: next().value };
    }
    // `continue` is a statement only in statement position
    if (t.type === "name" && t.value === "continue") {
      next();
      return { kind: "ContinueStatement" };
    }
    if (t.value === "do") {
      next();
      const body = parseBlock();
      expect("end");
      return { kind: "DoStatement", body };
    }
    if (t.value === "while") {
      next();
      const cond = parseExpr();
      expect("do");
      const body = parseBlock();
      expect("end");
      return { kind: "WhileStatement", cond, body };
    }
    if (t.value === "repeat") {
      next();
      const body = parseBlock();
      expect("until");
      const cond = parseExpr();
      return { kind: "RepeatStatement", body, cond };
    }
    if (t.value === "if") {
      next();
      const clauses: Array<{ cond: Expression; body: Statement[] }> = [];
      clauses.push({ cond: parseExpr(), body: (expect("then"), parseBlock()) });
      while (accept("elseif")) {
        const cond = parseExpr();
        expect("then");
        clauses.push({ cond, body: parseBlock() });
      }
      let elseBody: Statement[] | null = null;
      if (accept("else")) elseBody = parseBlock();
      expect("end");
      return { kind: "IfStatement", clauses, elseBody };
    }
    if (t.value === "for") {
      next();
      if (!isType("name")) fail("expected identifier after 'for'");
      const firstName = next().value;
      let firstType: TypeNode | null = null;
      if (accept(":")) firstType = parseType();
      if (is("=")) {
        next();
        const start = parseExpr();
        expect(",");
        const end = parseExpr();
        let step: Expression | null = null;
        if (accept(",")) step = parseExpr();
        expect("do");
        const body = parseBlock();
        expect("end");
        return {
          kind: "NumericForStatement",
          variable: { kind: "Identifier", name: firstName },
          start,
          end,
          step,
          body,
        };
      }
      const variables: Identifier[] = [{ kind: "Identifier", name: firstName }];
      const types: Array<TypeNode | null> = [firstType];
      while (accept(",")) {
        if (!isType("name")) fail("expected identifier in for-in list");
        variables.push({ kind: "Identifier", name: next().value });
        types.push(accept(":") ? parseType() : null);
      }
      expect("in");
      const iterators = parseExprList();
      expect("do");
      const body = parseBlock();
      expect("end");
      return { kind: "GenericForStatement", variables, types, iterators, body };
    }
    if (t.value === "function") {
      next();
      // funcname ::= Name {'.' Name} [':' Name]
      if (!isType("name")) fail("expected function name");
      let name: Expression = { kind: "Identifier", name: next().value };
      let isMethod = false;
      while (is(".")) {
        next();
        if (!isType("name")) fail("expected property name after '.'");
        name = {
          kind: "IndexExpression",
          base: name,
          index: { kind: "Identifier", name: next().value, isProperty: true },
          syntax: ".",
        };
      }
      if (accept(":")) {
        if (!isType("name")) fail("expected method name after ':'");
        name = {
          kind: "IndexExpression",
          base: name,
          index: { kind: "Identifier", name: next().value, isProperty: true },
          syntax: ".",
        };
        isMethod = true;
      }
      const fn = parseFunctionBody(isMethod);
      return {
        kind: "FunctionStatement",
        name,
        isMethod,
        isVararg: fn.isVararg,
        params: fn.params,
        paramTypes: fn.paramTypes,
        returnType: fn.returnType,
        generics: fn.generics,
        body: fn.body,
      };
    }
    if (t.value === "local") {
      next();
      if (accept("function")) {
        if (!isType("name")) fail("expected function name");
        const name = next().value;
        const fn = parseFunctionBody(false);
        return {
          kind: "LocalFunctionStatement",
          name: { kind: "Identifier", name },
          isVararg: fn.isVararg,
          params: fn.params,
          paramTypes: fn.paramTypes,
          returnType: fn.returnType,
          generics: fn.generics,
          body: fn.body,
        };
      }
      const names: Identifier[] = [];
      const types: Array<TypeNode | null> = [];
      const attrs: Array<string | null> = [];
      do {
        if (!isType("name")) fail("expected identifier name");
        names.push({ kind: "Identifier", name: next().value });
        types.push(accept(":") ? parseType() : null);
        let attr: string | null = null;
        if (is("<")) {
          next();
          if (!isType("name")) fail("expected attribute name");
          attr = next().value;
          if (attr !== "const" && attr !== "close") fail(`unknown attribute <${attr}>`);
          expect(">");
        }
        attrs.push(attr);
      } while (accept(","));
      const values = accept("=") ? parseExprList() : [];
      return { kind: "LocalStatement", names, types, attrs, values };
    }

    // Luau `type X = T` / `export type X = T`
    if (t.type === "name" && t.value === "export" && peek(1).value === "type" && isTypeAlias(2)) {
      next();
      return parseTypeAlias(true);
    }
    if (t.type === "name" && t.value === "type" && isTypeAlias(1)) {
      return parseTypeAlias(false);
    }

    return parseExpressionStatement();
  }

  /** `offset` is the index of the token right after the `type` keyword. */
  function isTypeAlias(offset: number): boolean {
    const b = peek(offset);
    if (!is("<", offset) && b.type !== "name") return false;
    let k = offset;
    if (peek(k).type === "name") k++;
    if (is("<", k)) {
      // skip a balanced generic parameter list
      let depth = 0;
      while (peek(k).type !== "eof") {
        if (is("<", k)) depth++;
        else if (is(">", k)) {
          depth--;
          if (depth === 0) {
            k++;
            break;
          }
        }
        k++;
      }
    }
    return is("=", k);
  }

  function parseTypeAlias(exported: boolean): Statement {
    next(); // `type`
    if (!isType("name")) fail("expected type name");
    const name = next().value;
    const generics = is("<") ? parseGenericTypeList() : [];
    expect("=");
    const type = parseType();
    return { kind: "TypeAliasStatement", exported, name, generics, type };
  }

  function parseExpressionStatement(): Statement {
    const targets = [parseExpr()];
    while (is(",")) {
      next();
      targets.push(parseExpr());
    }

    const COMPOUND = ["=", "+=", "-=", "*=", "/=", "//=", "%=", "^=", "..="];
    const opValue = COMPOUND.find((o) => is(o));
    if (opValue) {
      next();
      // compound assignment (`a += b`) never takes a target list
      if (opValue !== "=" && targets.length > 1) fail("cannot assign to multiple values");
      const values = parseExprList();
      return {
        kind: "AssignmentStatement",
        targets,
        op: opValue === "=" ? undefined : opValue,
        values,
      };
    }

    if (
      targets.length === 1 &&
      (targets[0].kind === "CallExpression" || targets[0].kind === "MethodCallExpression")
    ) {
      return { kind: "CallStatement", expr: targets[0] };
    }
    return fail(`syntax error near '${peek().value}'`);
  }

  function parseChunk(): Chunk {
    const body = parseBlock();
    if (!isType("eof")) fail(`unexpected symbol '${peek().value}'`);
    return { kind: "Chunk", body, prologue };
  }

  function parseExpression(): Expression {
    const e = parseExpr();
    if (!isType("eof")) fail(`unexpected symbol '${peek().value}' in expression`);
    return e;
  }

  return { parseChunk, parseExpression };
}

void LUA_KEYWORDS;
void LUAU_CONTEXTUAL;
