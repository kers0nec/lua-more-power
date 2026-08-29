import { useState } from "react";

export function CopyCode({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--border)" }}>
      <div
        className="flex items-center justify-between gap-3 border-b px-3 py-2"
        style={{ borderColor: "var(--border)", background: "var(--muted)" }}
      >
        <span className="font-mono text-[11px] uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          {label ?? "code"}
        </span>
        <button type="button" onClick={copy} className="btn-ghost px-2 py-1 text-xs">
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre
        className="overflow-x-auto p-4 text-xs leading-relaxed"
        style={{ background: "var(--input)", fontFamily: "var(--font-mono)" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
