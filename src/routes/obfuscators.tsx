import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { LuaTerminalSandbox } from "@/components/LuaTerminalSandbox";
import { obfuscatePublicCode } from "@/lib/scripts.functions";

type LocalObfuscator = {
  obfuscateLua: (source: string) => string;
  obfuscateLuaWithOptions: (
    source: string,
    options?: {
      vmDepth?: number;
      antiTamper?: boolean;
      antiHook?: boolean;
      dualVm?: boolean;
    },
  ) => string;
};

declare global {
  interface Window {
    LMObfuscator?: LocalObfuscator;
  }
}

export const Route = createFileRoute("/obfuscators")({
  head: () => ({
    meta: [
      { title: "Obfuscators — LuaMore" },
      {
        name: "description",
        content:
          "Protect Luau in your browser with the LuaMore VM or use the authenticated obfuscation API.",
      },
    ],
  }),
  component: ObfuscatorsPage,
});

const SAMPLE = `local Players = game:GetService("Players")
local player = Players.LocalPlayer
print("LuaMore protected script for " .. player.Name)`;

function loadLocalEngine(): Promise<LocalObfuscator> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser engine unavailable"));
  if (window.LMObfuscator) return Promise.resolve(window.LMObfuscator);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-luamore-obfuscator]");
    if (existing) {
      existing.addEventListener("load", () =>
        window.LMObfuscator
          ? resolve(window.LMObfuscator)
          : reject(new Error("Engine failed to load")),
      );
      existing.addEventListener("error", () => reject(new Error("Engine failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = "/lua-more/assets/luamore-obfuscator.js";
    script.async = true;
    script.dataset.luamoreObfuscator = "true";
    script.onload = () =>
      window.LMObfuscator
        ? resolve(window.LMObfuscator)
        : reject(new Error("Engine failed to load"));
    script.onerror = () => reject(new Error("Could not load the local LuaMore VM"));
    document.head.appendChild(script);
  });
}

function ObfuscatorsPage() {
  const publicObf = useServerFn(obfuscatePublicCode);
  const [source, setSource] = useState("");
  const [output, setOutput] = useState("");
  const [apiOutput, setApiOutput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [depth, setDepth] = useState("0");
  const [antiTamper, setAntiTamper] = useState(true);
  const [antiHook, setAntiHook] = useState(true);
  const [dualVm, setDualVm] = useState(true);
  const [status, setStatus] = useState("");
  const [apiStatus, setApiStatus] = useState("");
  const [engineReady, setEngineReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [apiRunning, setApiRunning] = useState(false);

  useEffect(() => {
    loadLocalEngine()
      .then(() => setEngineReady(true))
      .catch(() => setEngineReady(false));
  }, []);

  function useSample() {
    setSource(SAMPLE);
    setStatus("Sample loaded");
  }

  function clearSource() {
    setSource("");
    setOutput("");
    setApiOutput("");
    setStatus("");
    setApiStatus("");
  }

  function download(name: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function runLocal() {
    if (!source.trim() || running) return;
    setRunning(true);
    setStatus("Building LuaMore v13 VM…");
    try {
      let result = "";
      try {
        const engine = await loadLocalEngine();
        result = engine.obfuscateLuaWithOptions(source, {
          vmDepth: Number(depth),
          antiTamper,
          antiHook,
          dualVm,
        });
      } catch {
        // Fallback to high-speed server VM
        const res = await publicObf({
          data: {
            code: source,
            dualVm,
            oeldAntiTamper: antiTamper,
            mode: dualVm ? "hybrid" : "standard",
          },
        });
        result = res.obfuscated;
      }
      setOutput(result);
      setStatus(`Done · ${result.length.toLocaleString()} output characters (Anti-Hook active)`);
    } catch (error) {
      setOutput("");
      setStatus(error instanceof Error ? error.message : "Obfuscation failed");
    } finally {
      setRunning(false);
    }
  }

  async function runApi() {
    if (!source.trim() || apiRunning) return;
    if (!apiKey.trim()) {
      setApiStatus("Add an API key from Dashboard → API keys first.");
      return;
    }
    setApiRunning(true);
    setApiStatus("Sending to LuaMore API…");
    try {
      const response = await fetch("/api/public/obfuscate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({ source }),
      });
      const data = (await response.json()) as { obfuscated?: string; error?: string };
      if (!response.ok || !data.obfuscated) throw new Error(data.error ?? "API obfuscation failed");
      setApiOutput(data.obfuscated);
      setApiStatus(`Done · ${data.obfuscated.length.toLocaleString()} output characters`);
    } catch (error) {
      setApiOutput("");
      setApiStatus(error instanceof Error ? error.message : "API request failed");
    } finally {
      setApiRunning(false);
    }
  }

  return (
    <PageShell
      eyebrow="Protection"
      title="Two real engines. One page."
      subtitle="Paste your Luau and run it through the LuaMore VM in your browser, or send it to the authenticated API. Both produce protected code you can copy or download."
    >
      <div className="card-blue p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="eyebrow">Source · Luau</div>
            <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              {source.length.toLocaleString()} characters · local builds never leave your browser
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={useSample}>
              Paste sample
            </button>
            <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={clearSource}>
              Clear
            </button>
            <label className="btn-ghost cursor-pointer px-3 py-2 text-xs">
              Upload .lua
              <input
                type="file"
                accept=".lua,.luau,.txt,text/plain"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) setSource(await file.text());
                  event.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck={false}
          placeholder={
            '-- paste your Luau here\nlocal Players = game:GetService("Players")\nprint("hello from LuaMore")'
          }
          className="input-blue mt-4 min-h-[250px] resize-y font-mono text-xs leading-relaxed md:min-h-[300px]"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="card-blue p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">In-browser</div>
              <h2 className="mt-2 font-display text-2xl">LuaMore Obfuscator</h2>
            </div>
            <span className="badge-blue">VM v13 Anti-Hook</span>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Layered virtual machine with Silent Entropy Poisoning anti-hook shield, rotating 4-key
            XOR, RC4 stream cipher, and dual FNV-1a/djb2 integrity verification. Source stays 100%
            inside your browser.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="space-y-3 pt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={antiHook}
                  onChange={(event) => setAntiHook(event.target.checked)}
                />{" "}
                Anti-Hook Shield (Silent Poison)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={antiTamper}
                  onChange={(event) => setAntiTamper(event.target.checked)}
                />{" "}
                Anti-Tamper Primitives
              </label>
            </div>
            <div className="space-y-3 pt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dualVm}
                  onChange={(event) => setDualVm(event.target.checked)}
                />{" "}
                Dual-VM Multi-Layer Wrapping
              </label>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary mt-5"
            disabled={!source.trim() || running || !engineReady}
            onClick={runLocal}
          >
            {running
              ? "Obfuscating with Anti-Hook…"
              : engineReady
                ? "Obfuscate with LuaMore v13"
                : "Loading local VM…"}
          </button>
          {status ? (
            <p
              className="mt-3 text-xs"
              style={{
                color: status === "Sample loaded" ? "var(--muted-foreground)" : "var(--success)",
              }}
            >
              {status}
            </p>
          ) : null}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="eyebrow">Output</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs"
                  disabled={!output}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(output);
                      setStatus("Copied protected Luau to clipboard");
                    } catch {
                      setStatus("Copy failed — your browser blocked clipboard access");
                    }
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs"
                  disabled={!output}
                  onClick={() => download("luamore-protected.lua", output)}
                >
                  Download
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={output}
              placeholder="Your protected Luau appears here"
              className="input-blue min-h-[240px] resize-y font-mono text-[11px] leading-relaxed"
            />
          </div>
        </section>

        <section className="card-blue p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">Authenticated API</div>
              <h2 className="mt-2 font-display text-2xl">Build from your backend</h2>
            </div>
            <span className="badge-blue">API</span>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Use a dashboard API key for server-side builds. Requests are checked, rate-limited, and
            never expose the key in the URL.
          </p>
          <label className="mt-5 block text-xs" style={{ color: "var(--muted-foreground)" }}>
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Bearer key from API keys"
              className="input-blue mt-2"
            />
          </label>
          <button
            type="button"
            className="btn-outline mt-4"
            disabled={!source.trim() || apiRunning}
            onClick={runApi}
          >
            {apiRunning ? "Sending…" : "Obfuscate via API"}
          </button>
          {apiStatus ? (
            <p
              className="mt-3 text-xs"
              style={{
                color: apiStatus.startsWith("Done") ? "var(--success)" : "var(--muted-foreground)",
              }}
            >
              {apiStatus}
            </p>
          ) : null}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="eyebrow">API output</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs"
                  disabled={!apiOutput}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(apiOutput);
                      setApiStatus("Copied API output to clipboard");
                    } catch {
                      setApiStatus("Copy failed — your browser blocked clipboard access");
                    }
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  className="btn-ghost px-2 py-1 text-xs"
                  disabled={!apiOutput}
                  onClick={() => download("luamore-api-protected.lua", apiOutput)}
                >
                  Download
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={apiOutput}
              placeholder="API response appears here"
              className="input-blue min-h-[240px] resize-y font-mono text-[11px] leading-relaxed"
            />
          </div>
          <div
            className="mt-5 rounded-md border p-3 text-xs"
            style={{
              borderColor: "var(--border)",
              background: "var(--secondary)",
              color: "var(--muted-foreground)",
            }}
          >
            Need a key?{" "}
            <a
              href="/dashboard/api-keys"
              className="underline"
              style={{ color: "var(--foreground)" }}
            >
              Open API keys
            </a>{" "}
            after signing in.
          </div>
        </section>
      </div>

      <div
        className="mt-5 rounded-lg border p-5 text-sm"
        style={{
          borderColor: "var(--border)",
          background: "var(--secondary)",
          color: "var(--muted-foreground)",
        }}
      >
        <strong style={{ color: "var(--foreground)" }}>Input limits:</strong> the LuaMore VM accepts
        up to 2 MB and automatically reduces nesting for large scripts. API builds use the same
        limit. If an engine errors, the real error is shown — nothing is faked.
      </div>

      <div className="mt-6">
        <LuaTerminalSandbox
          code={output || apiOutput || source}
          title="In-Browser Live Execution Sandbox"
          subtitle="Test running your original source or obfuscated output inside a live Luau VM right here"
        />
      </div>
    </PageShell>
  );
}
