import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { obfuscateCode } from "@/lib/scripts.functions";

export const Route = createFileRoute("/_authenticated/dashboard/obfuscate")({
  head: () => ({
    meta: [
      { title: "Obfuscator — LuaMore" },
      {
        name: "description",
        content: "Protect any Luau snippet with the LuaMore VM v6 obfuscator.",
      },
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
  } catch {
    /* not JSON */
  }
  return raw;
}

function ObfuscatePage() {
  const obf = useServerFn(obfuscateCode);
  const [code, setCode] = useState("");
  const [out, setOut] = useState("");
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pushLog = (line: string) =>
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const startProgress = (bytes: number) => {
    const stages = [
      "parsing source",
      "compressing (RLE)",
      "encrypting layer 1 (4×XOR + RC4)",
      "shuffling opcodes",
      "signing (FNV-1a + djb2)",
      "building nested VM",
      "injecting LuaMore Protection prelude",
      "flattening dispatcher",
      "minifying bootstrap",
    ];
    pushLog(`input: ${bytes.toLocaleString()} bytes`);
    stages.forEach((s, i) => {
      const t = setTimeout(() => pushLog(`… ${s}`), 200 + i * 350);
      timersRef.current.push(t);
    });
  };

  const runObf = async () => {
    if (!code.trim() || running) return;
    setRunning(true);
    setOut("");
    setStatus("");
    setLogs([]);
    const controller = new AbortController();
    abortRef.current = controller;
    startProgress(code.length);
    try {
      const r = await obf({ data: { code }, signal: controller.signal });
      if (controller.signal.aborted) return;
      clearTimers();
      pushLog(`✓ done — ${r.size.toLocaleString()} chars out`);
      setOut(r.obfuscated);
      setStatus(
        `✓ Obfuscated — ${r.sourceSize.toLocaleString()} → ${r.size.toLocaleString()} chars · LuaMore VM v9`,
      );
    } catch (e) {
      clearTimers();
      if (controller.signal.aborted) {
        pushLog("✗ cancelled by user");
        setStatus("✗ Cancelled");
      } else {
        const msg = prettyError(e);
        pushLog(`✗ ${msg}`);
        setOut("");
        setStatus(`✗ ${msg}`);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const cancelObf = () => {
    abortRef.current?.abort();
    clearTimers();
  };

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
          LuaMore VM v6 — parse, optimize, compile to pseudo-bytecode, flatten control flow, shuffle
          opcodes, RLE compress, 4× rotating XOR + RC4 encrypt, dual FNV-1a/djb2 sign, triple VM
          bootstrap, minify. Hardened anti-env-logger, anti-tamper, anti-debug, anti-decompile.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card-blue p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              SOURCE (Luau)
            </div>
            <div
              className="flex items-center gap-3 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>{code.length.toLocaleString()} chars</span>
              <label className="btn-outline text-xs cursor-pointer">
                Upload file
                <input
                  type="file"
                  accept=".lua,.luau,.txt,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    onUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onUpload(e.dataTransfer.files?.[0]);
            }}
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
              onClick={() => {
                setCode("");
                setOut("");
                setStatus("");
              }}
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
            <div
              className="flex items-center gap-3 text-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>{out.length.toLocaleString()} chars</span>
              <button
                onClick={copyOut}
                disabled={!out}
                className="btn-outline text-xs disabled:opacity-40"
              >
                Copy
              </button>
              <button
                onClick={downloadOut}
                disabled={!out}
                className="btn-outline text-xs disabled:opacity-40"
              >
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
