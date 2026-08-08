import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { obfuscateCode } from "@/lib/scripts.functions";

export const Route = createFileRoute("/_authenticated/dashboard/obfuscate")({
  head: () => ({
    meta: [
      { title: "Obfuscator — LuaMore" },
      { name: "description", content: "Protect any Luau snippet with the LuaMore VM v2 obfuscator." },
    ],
  }),
  component: ObfuscatePage,
});

function prettyError(e: unknown) {
  const raw = e instanceof Error ? e.message : String(e ?? "Failed");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((i: { code?: string; path?: (string | number)[]; message?: string }) =>
          i.code === "too_big" && i.path?.[0] === "code"
            ? "Script is too large to obfuscate"
            : `${i.path?.join(".") ?? "input"}: ${i.message ?? "invalid"}`,
        )
        .join(", ");
    }
  } catch { /* not JSON */ }
  return raw;
}

function ObfuscatePage() {
  const obf = useServerFn(obfuscateCode);
  const [code, setCode] = useState("");
  const [out, setOut] = useState("");
  const [status, setStatus] = useState("");

  const mut = useMutation({
    mutationFn: () => obf({ data: { code } }),
    onSuccess: (r) => {
      setOut(r.obfuscated);
      setStatus(
        `✓ Obfuscated — ${r.sourceSize.toLocaleString()} → ${r.size.toLocaleString()} chars · LuaMore VM v2`,
      );
    },
    onError: (e) => {
      setOut("");
      setStatus(`✗ ${prettyError(e)}`);
    },
  });

  const onUpload = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setCode(text);
      setStatus(`✓ Loaded ${file.name} (${text.length.toLocaleString()} chars)`);
    } catch {
      setStatus("✗ Could not read that file");
    }
  };

  const copyOut = async () => {
    if (!out) return;
    try {
      await navigator.clipboard.writeText(out);
      setStatus("✓ Copied to clipboard");
    } catch {
      setStatus("✗ Copy failed");
    }
  };

  const downloadOut = () => {
    if (!out) return;
    const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luamore-vm-${Date.now()}.lua`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <div>
        <div className="eyebrow">Protection</div>
        <h1 className="mt-3 font-display text-5xl md:text-6xl">
          Obfusc<span style={{ fontStyle: "italic" }}>ator</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm" style={{ color: "var(--muted-foreground)" }}>
          One-off protection using LuaMore VM v3 — triple VM bootstrap, 4× rotating XOR, keyed permutation, FNV-1a anti-tamper, hardened anti-env-logger, anti-debug, anti-decompile.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card-blue p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              SOURCE (Luau)
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span>{code.length.toLocaleString()} chars</span>
              <label className="btn-outline text-xs cursor-pointer">
                Upload file
                <input
                  type="file"
                  accept=".lua,.luau,.txt,text/plain"
                  className="hidden"
                  onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onUpload(e.dataTransfer.files?.[0]); }}
            placeholder='print("hello luamore")'
            className="input-blue font-mono text-sm h-[440px] resize-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !code.trim()}
              className="btn-primary"
            >
              {mut.isPending ? "Obfuscating…" : "Obfuscate"}
            </button>
            <button
              onClick={() => { setCode(""); setOut(""); setStatus(""); }}
              className="btn-outline"
            >
              Clear
            </button>
            {status && (
              <span
                className="text-sm"
                style={{ color: status.startsWith("✓") ? "var(--success)" : "var(--destructive)" }}
              >
                {status}
              </span>
            )}
          </div>
        </div>

        <div className="card-blue p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              OBFUSCATED OUTPUT
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span>{out.length.toLocaleString()} chars</span>
              <button onClick={copyOut} disabled={!out} className="btn-outline text-xs disabled:opacity-40">
                Copy
              </button>
              <button onClick={downloadOut} disabled={!out} className="btn-outline text-xs disabled:opacity-40">
                Download .lua
              </button>
            </div>
          </div>
          <textarea
            value={out}
            readOnly
            spellCheck={false}
            placeholder="Obfuscated output appears here"
            className="input-blue font-mono text-xs h-[440px] resize-none"
          />
        </div>
      </div>
    </div>
  );
}
