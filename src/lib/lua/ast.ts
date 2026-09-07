/**
 * AST for Lua 5.1 – 5.4 and Luau.
 *
 * Design note on parentheses: the parser records `paren: true` on any
 * expression that was written inside parentheses. The emitter never reasons
 * about operator precedence — it re-emits exactly those parentheses. That
 * makes round-tripping structurally lossless, which is what keeps
 * `(f())` (multiple-return truncation) and `-(2^2)` style expressions intact.
 */

export type Position = { line: number; col: number };

export interface BaseNode {
  paren?: boolean;
  loc?: { start: number; end: number; line: number };
}

/* ------------------------------------------------------------------ types */

export type TypeNode =
  | { kind: "TName"; name: string; generics: TypeNode[] }
  | { kind: "TString"; value: string }
  | { kind: "TBoolean"; value: boolean }
  | { kind: "TNil" }
  | { kind: "TAny" }
  | { kind: "TUnknown" }
  | { kind: "TNever" }
  | {
      kind: "TTable";
      fields: Array<{
        key?: TypeNode | string;
        keyIsName?: boolean;
        value: TypeNode;
        readOnly?: boolean;
      }>;
    }
  | {
      kind: "TFunction";
      generics: string[];
      params: Array<{ name?: string; type: TypeNode; variadic?: boolean }>;
      returns: TypeNode[];
    }
  | { kind: "TUnion"; parts: TypeNode[] }
  | { kind: "TIntersection"; parts: TypeNode[] }
  | { kind: "TTypeof"; expr: Expression }
  | { kind: "TSingleton"; negative?: boolean; value: string | number | boolean }
  | { kind: "TVariadic" }
  | { kind: "TNone" };

/* ------------------------------------------------------------- statements */

export interface LocalStatement extends BaseNode {
  kind: "LocalStatement";
  names: Identifier[];
  types: Array<TypeNode | null>;
  attrs: Array<string | null>; // `<const>` / `<close>`
  values: Expression[];
}

export interface AssignmentStatement extends BaseNode {
  kind: "AssignmentStatement";
  targets: Expression[]; // Identifier | IndexExpression
  op?: string; // Luau compound assignment: "+=", "..=", …
  values: Expression[];
}

export interface CallStatement extends BaseNode {
  kind: "CallStatement";
  expr: CallExpression | MethodCallExpression;
}

export interface DoStatement extends BaseNode {
  kind: "DoStatement";
  body: Statement[];
}

export interface WhileStatement extends BaseNode {
  kind: "WhileStatement";
  cond: Expression;
  body: Statement[];
}

export interface RepeatStatement extends BaseNode {
  kind: "RepeatStatement";
  body: Statement[];
  cond: Expression;
}

export interface IfClause {
  cond: Expression;
  body: Statement[];
}

export interface IfStatement extends BaseNode {
  kind: "IfStatement";
  clauses: IfClause[];
  elseBody: Statement[] | null;
}

export interface NumericForStatement extends BaseNode {
  kind: "NumericForStatement";
  variable: Identifier;
  start: Expression;
  end: Expression;
  step: Expression | null;
  body: Statement[];
}

export interface GenericForStatement extends BaseNode {
  kind: "GenericForStatement";
  variables: Identifier[];
  types: Array<TypeNode | null>;
  iterators: Expression[];
  body: Statement[];
}

export interface FunctionStatement extends BaseNode {
  kind: "FunctionStatement";
  name: Expression; // Identifier or IndexExpression chain
  isMethod: boolean;
  isVararg?: boolean;
  params: Identifier[];
  paramTypes: Array<TypeNode | null>;
  returnType: TypeNode | null;
  generics: string[];
  body: Statement[];
}

export interface LocalFunctionStatement extends BaseNode {
  kind: "LocalFunctionStatement";
  name: Identifier;
  isVararg?: boolean;
  params: Identifier[];
  paramTypes: Array<TypeNode | null>;
  returnType: TypeNode | null;
  generics: string[];
  body: Statement[];
}

export interface ReturnStatement extends BaseNode {
  kind: "ReturnStatement";
  values: Expression[];
}

export interface BreakStatement extends BaseNode {
  kind: "BreakStatement";
}

export interface ContinueStatement extends BaseNode {
  kind: "ContinueStatement";
}

export interface GotoStatement extends BaseNode {
  kind: "GotoStatement";
  label: string;
}

export interface LabelStatement extends BaseNode {
  kind: "LabelStatement";
  label: string;
}

export interface TypeAliasStatement extends BaseNode {
  kind: "TypeAliasStatement";
  exported: boolean;
  name: string;
  generics: string[];
  type: TypeNode;
}

export type Statement =
  | LocalStatement
  | AssignmentStatement
  | CallStatement
  | DoStatement
  | WhileStatement
  | RepeatStatement
  | IfStatement
  | NumericForStatement
  | GenericForStatement
  | FunctionStatement
  | LocalFunctionStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | GotoStatement
  | LabelStatement
  | TypeAliasStatement;

/* ------------------------------------------------------------ expressions */

export interface Declaration {
  name: string;
  /** stable id used by the renamer */
  id: number;
  kind: "local" | "param" | "function" | "for";
  /**
   * Set for declarations with no renameable node in the AST — the implicit
   * `self` of a `:` method, whose name is fixed by the `function a:b()` syntax.
   */
  keepName?: boolean;
}

export interface Identifier extends BaseNode {
  kind: "Identifier";
  name: string;
  /** set by scope resolution; `null` means "unresolved / global" */
  decl?: Declaration | null;
  /** true when this identifier is a `.` property name and must never be renamed */
  isProperty?: boolean;
}

export interface NumericLiteral extends BaseNode {
  kind: "NumericLiteral";
  value: number;
  raw: string;
  /** true when the literal is written as an integer (no `.`, no `e`/`p` exponent) */
  isInteger: boolean;
  /** Luau `123ull` style suffix */
  suffix?: string;
}

/** `bytes` holds the literal's exact byte content (each char code is 0..255). */
export interface StringLiteral extends BaseNode {
  kind: "StringLiteral";
  bytes: string;
  raw: string;
}

export interface BooleanLiteral extends BaseNode {
  kind: "BooleanLiteral";
  value: boolean;
}

export interface NilLiteral extends BaseNode {
  kind: "NilLiteral";
}

export interface VarargLiteral extends BaseNode {
  kind: "VarargLiteral";
}

export interface BinaryExpression extends BaseNode {
  kind: "BinaryExpression";
  op: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  kind: "UnaryExpression";
  op: string; // "-" | "not" | "#" | "~"
  arg: Expression;
}

export interface CallExpression extends BaseNode {
  kind: "CallExpression";
  callee: Expression;
  args: Expression[];
}

export interface MethodCallExpression extends BaseNode {
  kind: "MethodCallExpression";
  base: Expression;
  method: Identifier;
  args: Expression[];
}

export interface IndexExpression extends BaseNode {
  kind: "IndexExpression";
  base: Expression;
  index: Expression; // Identifier (dot) or any expression (bracket)
  syntax: "." | "[";
}

export interface FunctionExpression extends BaseNode {
  kind: "FunctionExpression";
  isVararg?: boolean;
  params: Identifier[];
  paramTypes: Array<TypeNode | null>;
  returnType: TypeNode | null;
  generics: string[];
  body: Statement[];
  isMethod?: boolean;
  selfParam?: Identifier | null;
}

export interface TableField {
  key?: Expression | string;
  keyKind: "value" | "name" | "expr";
  value: Expression;
}

export interface TableConstructor extends BaseNode {
  kind: "TableConstructor";
  fields: TableField[];
}

export interface IfExpression extends BaseNode {
  kind: "IfExpression";
  cond: Expression;
  whenTrue: Expression;
  whenFalse: Expression;
}

export interface TypeCast extends BaseNode {
  kind: "TypeCast";
  expr: Expression;
  type: TypeNode;
}

export interface InterpolatedString extends BaseNode {
  kind: "InterpolatedString";
  /** string parts are byte strings; expressions are interpolated */
  parts: Array<{ type: "text"; bytes: string } | { type: "expr"; expr: Expression }>;
}

export type Expression =
  | Identifier
  | NumericLiteral
  | StringLiteral
  | BooleanLiteral
  | NilLiteral
  | VarargLiteral
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | MethodCallExpression
  | IndexExpression
  | FunctionExpression
  | TableConstructor
  | IfExpression
  | TypeCast
  | InterpolatedString;

export interface Chunk {
  kind: "Chunk";
  body: Statement[];
  /** leading `--!strict` / shebang style lines preserved verbatim */
  prologue: string[];
}

/* ----------------------------------------------------------------- helpers */

export function isCallLike(e: Expression): boolean {
  return (
    e.kind === "CallExpression" || e.kind === "MethodCallExpression" || e.kind === "VarargLiteral"
  );
}

/** True when `e` may expand to multiple values (i.e. it must stay last in a list). */
export function isMultires(e: Expression): boolean {
  if (e.paren) return false;
  return isCallLike(e);
}
