/**
 * AST → Lua/Luau source.
 *
 * The emitter never re-derives operator precedence: it re-emits exactly the
 * parentheses the parser recorded. Combined with a byte-exact string encoder
 * this makes `emit(parse(src))` semantically identical to `src`, which is the
 * invariant the whole obfuscator relies on.
 */

import type { Chunk, Expression, Statement, TableField, TypeNode } from "./ast.ts";

export interface EmitOptions {
  /** emit with minimal whitespace */
  compact?: boolean;
  indent?: string;
}

export function emit(chunk: Chunk, options: EmitOptions = {}): string {
  const compact = options.compact ?? false;
  const indentStr = options.indent ?? (compact ? "" : "  ");
  // Keywords and names always need a separator between them, so even compact
  // output keeps single spaces; only indentation and line breaks are dropped.
  const nl = compact ? " " : "\n";
  const sp = " ";

  const parts: string[] = [];
  if (chunk.prologue.length > 0) parts.push(chunk.prologue.join("\n") + "\n");

  const body = emitBlock(chunk.body, 0);
  parts.push(body);

  let out = parts.join("");
  if (!compact) {
    out = out
      .split("\n")
      .filter((l) => l.trim().length > 0)
      .join("\n");
  } else {
    out = out.replace(/\s+$/g, "");
  }
  if (out.length > 0 && !out.endsWith("\n")) out += "\n";
  return out;

  function indent(level: number): string {
    return compact ? "" : indentStr.repeat(level);
  }

  function emitBlock(body: Statement[], level: number): string {
    const lines: string[] = [];
    let prevEndsExpr = false;
    for (const s of body) {
      const text = emitStatement(s, level);
      // Lua parses `f() (g)()` as one call; a leading `(` needs a separator.
      const needsGuard = text.startsWith("(");
      lines.push(indent(level) + (needsGuard && prevEndsExpr ? ";" : "") + text);
      prevEndsExpr = endsWithExpression(s);
    }
    return lines.join(nl) + (lines.length ? nl : "");
  }

  function emitBlockInline(body: Statement[], level: number): string {
    if (compact) {
      const inner = body
        .map((s) => emitStatement(s, level + 1))
        .map((t, idx) => (idx > 0 && needsSeparator(body[idx - 1], body[idx]) ? "; " + t : t))
        .join(" ");
      // the surrounding keywords (`do`, `then`, `repeat`, …) need separating too
      return inner.length ? ` ${inner} ` : " ";
    }
    return nl + emitBlock(body, level + 1) + indent(level);
  }

  function needsSeparator(prev: Statement, next: Statement): boolean {
    if (
      prev.kind === "ReturnStatement" ||
      prev.kind === "BreakStatement" ||
      prev.kind === "ContinueStatement"
    ) {
      return false; // those already terminate the block
    }
    const text = emitStatement(next, 0);
    return text.startsWith("(") && endsWithExpression(prev);
  }

  function endsWithExpression(s: Statement): boolean {
    switch (s.kind) {
      case "CallStatement":
      case "AssignmentStatement":
      case "LocalStatement":
      case "FunctionStatement":
      case "LocalFunctionStatement":
        return true;
      default:
        return false;
    }
  }

  function emitStatement(s: Statement, level: number): string {
    switch (s.kind) {
      case "LocalStatement": {
        const names = s.names.map((n, i) => {
          let text = n.name;
          if (s.types[i]) text += `:${sp}${emitType(s.types[i]!)}`;
          if (s.attrs[i]) text += `${sp}<${s.attrs[i]}>`;
          return text;
        });
        const head = `local ${names.join(`,${sp}`)}`;
        return s.values.length > 0
          ? `${head}${sp}=${sp}${s.values.map(emitExpr).join(`,${sp}`)}`
          : head;
      }
      case "AssignmentStatement": {
        const op = s.op ?? "=";
        return `${s.targets.map(emitExpr).join(`,${sp}`)}${sp}${op}${sp}${s.values.map(emitExpr).join(`,${sp}`)}`;
      }
      case "CallStatement":
        return emitExpr(s.expr);
      case "DoStatement":
        return `do${emitBlockInline(s.body, level)}end`;
      case "WhileStatement":
        return `while${sp}${emitExpr(s.cond)}${sp}do${emitBlockInline(s.body, level)}end`;
      case "RepeatStatement":
        return `repeat${emitBlockInline(s.body, level)}until${sp}${emitExpr(s.cond)}`;
      case "IfStatement": {
        let out = "";
        s.clauses.forEach((c, i) => {
          out += `${i === 0 ? "if" : `${sp}elseif`}${sp}${emitExpr(c.cond)}${sp}then${emitBlockInline(c.body, level)}`;
        });
        if (s.elseBody) out += `${sp}else${emitBlockInline(s.elseBody, level)}`;
        return out + "end";
      }
      case "NumericForStatement": {
        const step = s.step ? `,${sp}${emitExpr(s.step)}` : "";
        return `for${sp}${s.variable.name}${sp}=${sp}${emitExpr(s.start)},${sp}${emitExpr(s.end)}${step}${sp}do${emitBlockInline(s.body, level)}end`;
      }
      case "GenericForStatement": {
        const vars = s.variables
          .map((v, i) => (s.types[i] ? `${v.name}:${sp}${emitType(s.types[i]!)}` : v.name))
          .join(`,${sp}`);
        return `for${sp}${vars}${sp}in${sp}${s.iterators.map(emitExpr).join(`,${sp}`)}${sp}do${emitBlockInline(s.body, level)}end`;
      }
      case "FunctionStatement": {
        const params = paramList(s.params, s.paramTypes, s.isVararg);
        const generics = s.generics.length ? `<${s.generics.join(",")}>` : "";
        const ret = s.returnType ? `:${sp}${emitType(s.returnType)}` : "";
        const name = emitFuncName(s.name, s.isMethod);
        return `function${sp}${name}${generics}(${params})${ret}${emitBlockInline(s.body, level)}end`;
      }
      case "LocalFunctionStatement": {
        const params = paramList(s.params, s.paramTypes, s.isVararg);
        const generics = s.generics.length ? `<${s.generics.join(",")}>` : "";
        const ret = s.returnType ? `:${sp}${emitType(s.returnType)}` : "";
        return `local${sp}function${sp}${s.name.name}${generics}(${params})${ret}${emitBlockInline(s.body, level)}end`;
      }
      case "ReturnStatement":
        return s.values.length ? `return${sp}${s.values.map(emitExpr).join(`,${sp}`)}` : "return";
      case "BreakStatement":
        return "break";
      case "ContinueStatement":
        return "continue";
      case "GotoStatement":
        return `goto ${s.label}`;
      case "LabelStatement":
        return `::${s.label}::`;
      case "TypeAliasStatement":
        return `${s.exported ? `export${sp}` : ""}type${sp}${s.name}${s.generics.length ? `<${s.generics.join(",")}>` : ""}${sp}=${sp}${emitType(s.type)}`;
    }
  }

  /** `a.b.c` or `a.b:method` for `function` statement heads. */
  function emitFuncName(name: Expression, isMethod: boolean): string {
    if (isMethod && name.kind === "IndexExpression") {
      return `${emitExpr(name.base)}:${(name.index as { name: string }).name}`;
    }
    return emitExpr(name);
  }

  function emitExpr(e: Expression): string {
    const raw = emitExprInner(e);
    return e.paren ? `(${raw})` : raw;
  }

  function emitExprInner(e: Expression): string {
    switch (e.kind) {
      case "Identifier":
        return e.name;
      case "NumericLiteral":
        return formatNumber(e.raw);
      case "StringLiteral":
        return encodeStringLiteral(e.bytes);
      case "BooleanLiteral":
        return e.value ? "true" : "false";
      case "NilLiteral":
        return "nil";
      case "VarargLiteral":
        return "...";
      case "BinaryExpression":
        return `${emitExpr(e.left)}${sp}${e.op}${sp}${emitExpr(e.right)}`;
      case "UnaryExpression": {
        const op = e.op === "not" ? `not${sp}` : e.op;
        return `${op}${emitExpr(e.arg)}`;
      }
      case "CallExpression":
        return `${emitExpr(e.callee)}(${e.args.map(emitExpr).join(`,${sp}`)})`;
      case "MethodCallExpression":
        return `${emitExpr(e.base)}:${e.method.name}(${e.args.map(emitExpr).join(`,${sp}`)})`;
      case "IndexExpression":
        return e.syntax === "."
          ? `${emitExpr(e.base)}.${(e.index as { name: string }).name}`
          : `${emitExpr(e.base)}[${emitExpr(e.index)}]`;
      case "FunctionExpression": {
        const params = paramList(e.params, e.paramTypes, e.isVararg);
        const generics = e.generics.length ? `<${e.generics.join(",")}>` : "";
        const ret = e.returnType ? `:${sp}${emitType(e.returnType)}` : "";
        return `function${generics}(${params})${ret}${emitBlockInline(e.body, 0)}end`;
      }
      case "TableConstructor":
        return emitTable(e.fields);
      case "IfExpression":
        return `if${sp}${emitExpr(e.cond)}${sp}then${sp}${emitExpr(e.whenTrue)}${sp}else${sp}${emitExpr(e.whenFalse)}`;
      case "TypeCast":
        return `${emitExpr(e.expr)}${sp}::${sp}${emitType(e.type)}`;
      case "InterpolatedString":
        return encodeInterpolated(e.parts, emitExpr);
    }
  }

  function paramList(
    params: Array<{ name: string }>,
    types: Array<TypeNode | null>,
    isVararg?: boolean,
  ): string {
    const parts = params.map((p, i) =>
      types[i] ? `${p.name}:${sp}${emitType(types[i]!)}` : p.name,
    );
    if (isVararg) parts.push("...");
    return parts.join(`,${sp}`);
  }

  function emitTable(fields: TableField[]): string {
    if (fields.length === 0) return "{}";
    const items = fields.map((f) => {
      if (f.keyKind === "name") return `${f.key as string}${sp}=${sp}${emitExpr(f.value)}`;
      if (f.keyKind === "expr")
        return `[${emitExpr(f.key as Expression)}]${sp}=${sp}${emitExpr(f.value)}`;
      return emitExpr(f.value);
    });
    return `{${items.join(`,${sp}`)}}`;
  }
}

/* ---------------------------------------------------------------- helpers */

function formatNumber(raw: string): string {
  // `1.` followed by a `.` would re-lex as the concat operator
  if (raw.endsWith(".")) return raw + "0";
  return raw;
}

/** Encode a byte string (char codes 0..255) as a Lua short-string literal. */
export function encodeStringLiteral(bytes: string): string {
  let out = '"';
  for (let i = 0; i < bytes.length; i++) {
    const code = bytes.charCodeAt(i);
    switch (code) {
      case 34:
        out += '\\"';
        break;
      case 92:
        out += "\\\\";
        break;
      case 10:
        out += "\\n";
        break;
      case 13:
        out += "\\r";
        break;
      case 9:
        out += "\\t";
        break;
      default:
        if (code < 32 || code === 127 || code > 126) out += "\\" + String(code).padStart(3, "0");
        else out += bytes[i];
    }
  }
  return out + '"';
}

function encodeInterpolated(
  parts: Array<{ type: "text"; bytes: string } | { type: "expr"; expr: Expression }>,
  emitExpr: (e: Expression) => string,
): string {
  let out = "`";
  for (const p of parts) {
    if (p.type === "text") {
      for (let i = 0; i < p.bytes.length; i++) {
        const code = p.bytes.charCodeAt(i);
        if (code === 96) out += "\\`";
        else if (code === 123) out += "\\{";
        else if (code === 125) out += "\\}";
        else if (code === 92) out += "\\\\";
        else if (code < 32 || code > 126) out += "\\" + String(code).padStart(3, "0");
        else out += p.bytes[i];
      }
    } else {
      out += `{${emitExpr(p.expr)}}`;
    }
  }
  return out + "`";
}

export function emitType(t: TypeNode): string {
  switch (t.kind) {
    case "TName":
      return t.generics.length ? `${t.name}<${t.generics.map(emitType).join(", ")}>` : t.name;
    case "TString":
      return encodeStringLiteral(t.value);
    case "TBoolean":
      return t.value ? "true" : "false";
    case "TNil":
      return "nil";
    case "TAny":
      return "any";
    case "TUnknown":
      return "unknown";
    case "TNever":
      return "never";
    case "TTable": {
      const fields = t.fields.map((f) => {
        const ro = f.readOnly ? "read " : "";
        if (f.key === undefined) return `${ro}${emitType(f.value)}`;
        if (f.keyIsName) return `${ro}${f.key as string}: ${emitType(f.value)}`;
        return `${ro}[${emitType(f.key as TypeNode)}]: ${emitType(f.value)}`;
      });
      return `{${fields.join(", ")}}`;
    }
    case "TFunction": {
      const generics = t.generics.length ? `<${t.generics.join(", ")}>` : "";
      const params = t.params
        .map((p) =>
          p.variadic ? "..." : p.name ? `${p.name}: ${emitType(p.type)}` : emitType(p.type),
        )
        .join(", ");
      return `${generics}(${params}) -> ${t.returns.map(emitType).join(", ")}`;
    }
    case "TUnion":
      return t.parts.map(emitType).join(" | ");
    case "TIntersection":
      return t.parts.map(emitType).join(" & ");
    case "TTypeof":
      return `typeof(${typeofExpr(t.expr)})`;
    case "TSingleton":
      return `${t.negative ? "-" : ""}${String(t.value)}`;
    case "TVariadic":
      return "...";
    case "TNone":
      return "()";
  }
}

/** Minimal expression printer for `typeof(...)` inside type annotations. */
function typeofExpr(e: Expression): string {
  const chunk = emit({
    kind: "Chunk",
    body: [{ kind: "ReturnStatement", values: [e] }],
    prologue: [],
  });
  return chunk.replace(/^return\s*/, "").replace(/\s+$/, "");
}
