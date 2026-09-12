import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Code2,
  Download,
  ExternalLink,
  Key,
  Lock,
  Play,
  Save,
  ShieldCheck,
  Terminal,
  Unlock,
  Upload,
  Zap,
} from "lucide-react";
import { getScript, obfuscateScriptNow, updateScript } from "@/lib/scripts.functions";
import { LuaTerminalSandbox } from "@/components/LuaTerminalSandbox";

export const Route = createFileRoute("/_authenticated/dashboard/scripts/$id")({
  head: () => ({
    meta: [
      { title: "Script Editor — LuaMore" },
      {
        name: "description",
        content: "Edit source, copy loaders, and manage LuaMore script protection.",
      },
      { property: "og:title", content: "Script Editor — LuaMore" },
      {
        property: "og:description",
        content: "Edit source, copy loaders, and manage LuaMore script protection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScriptDetail,
});

function ScriptDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getScript);
  const update = useServerFn(updateScript);
  const protect = useServerFn(obfuscateScriptNow);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["script", id], queryFn: () => get({ data: { id } }) });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [ffa, setFfa] = useState(false);
  const [autoProtect, setAutoProtect] = useState(false);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const [hydratedId, setHydratedId] = useState<string | null>(null);
  const [loaderTab, setLoaderTab] = useState<"standalone" | "keysystem" | "ffa">("standalone");
  const [sampleKey, setSampleKey] = useState("eggbm6ywzw7k3l1iht1lmeb5");
  const [editorView, setEditorView] = useState<"source" | "obfuscated">("source");
  const script = query.data?.script as Record<string, unknown> | undefined;

  useEffect(() => {
    if (!script || hydratedId === (script.id as string)) return;
    setCode((script.code as string) ?? "");
    setName((script.name as string) ?? "");
    setDescription((script.description as string) ?? "");
    setCategory((script.category as string) ?? "");
    setTags(((script.tags as string[]) ?? []).join(", "));
    setFfa(Boolean(script.ffa));
    setLoaderTab(script.obfuscated_code ? "standalone" : script.ffa ? "ffa" : "keysystem");
    setAutoProtect(Boolean(script.is_protected));
    setHydratedId(script.id as string);
  }, [script, hydratedId]);

  const loader = useMemo(() => {
    if (!script) return "";
    const publicId = script.public_id || "87b653a7b59a722de8";
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://luamore.app";

    if (loaderTab === "standalone") {
      if (script.obfuscated_code) {
        return script.obfuscated_code;
      }
      return `-- [[ LuaMore Standalone Protected Script ]]
-- Click 'Protect script' in the Protection card to compile your polymorphic bytecode VM
-- Or copy the source below for direct execution:

${code}`;
    }

    if (loaderTab === "ffa") {
      return `script_key = "trial"
loadstring(game:HttpGet("${origin}/scripts/hosted/${publicId}.lua"))()`;
    }

    return `script_key = "${sampleKey || "YOUR_KEY"}";
loadstring(game:HttpGet("${origin}/scripts/hosted/${publicId}.lua"))()`;
  }, [script, loaderTab, sampleKey, code]);

  const canSave = Boolean(script && hydratedId === script.id && name.trim() && !query.isFetching);

  const saveMutation = useMutation({
    mutationFn: () =>
      update({
        data: {
          id,
          name: name.trim(),
          code,
          description,
          category,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          ffa,
          is_protected: autoProtect,
        },
      }),
    onSuccess: () => {
      setStatus(autoProtect ? "OK Source saved and protection rebuilt" : "OK Source saved");
      queryClient.invalidateQueries({ queryKey: ["script", id] });
      queryClient.invalidateQueries({ queryKey: ["scripts"] });
    },
    onError: (error) =>
      setStatus(`ERR ${error instanceof Error ? error.message : "Could not save source"}`),
  });
  const protectMutation = useMutation({
    mutationFn: () => protect({ data: { id, code } }),
    onSuccess: (result) => {
      setStatus(`OK Protected output generated · ${result.size.toLocaleString()} characters`);
      setAutoProtect(true);
      queryClient.invalidateQueries({ queryKey: ["script", id] });
      queryClient.invalidateQueries({ queryKey: ["scripts"] });
    },
    onError: (error) =>
      setStatus(`ERR ${error instanceof Error ? error.message : "Protection failed"}`),
  });

  async function readFile(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      setCode(text);
      setStatus(`OK Loaded ${file.name} · save to keep it`);
    } catch {
      setStatus("ERR Could not read that file");
    }
  }
  async function copyLoader() {
    if (!loader) return;
    await navigator.clipboard.writeText(loader);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  function downloadSource() {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${name || "script"}.lua`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const toggleKeySystemMode = () => {
    const nextFfa = !ffa;
    setFfa(nextFfa);
    setLoaderTab(nextFfa ? "ffa" : "keysystem");
    setStatus(
      nextFfa
        ? "Switched to Public (FFA) mode. Remember to save!"
        : "Enabled Key System protection. Remember to save!",
    );
  };

  if (query.isLoading)
    return (
      <div className="app-page">
        <div className="instrument-topbar border border-border bg-card">
          Loading source from LuaMore Cloud…
        </div>
        <div className="mt-4 h-96 animate-pulse border border-border bg-card" />
      </div>
    );
  if (query.isError || !script)
    return (
      <div className="app-page">
        <Link to="/dashboard/scripts" className="btn-ghost">
          <ArrowLeft size={15} /> Scripts
        </Link>
        <div className="mt-8 border border-destructive/40 bg-destructive/10 p-6 text-destructive">
          {query.error instanceof Error ? query.error.message : "Script not found"}
        </div>
      </div>
    );

  return (
    <div className="app-page max-w-[88rem]">
      <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-7">
        <div>
          <Link
            to="/dashboard/scripts"
            className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> All scripts
          </Link>
          <div className="flex items-center gap-3">
            <div className="eyebrow">Script workspace</div>
            {script.public_id && (
              <span className="font-mono font-semibold tracking-widest text-primary bg-primary/10 border border-primary/30 px-3 py-0.5 rounded-full text-xs select-all shadow-inner">
                {script.public_id}
              </span>
            )}
          </div>
          <input
            className="mt-2 w-full max-w-2xl border-0 bg-transparent p-0 font-display text-4xl text-foreground outline-none md:text-5xl"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Script name"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleKeySystemMode}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-md transition-all shadow-sm ${
              !ffa
                ? "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
                : "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
            }`}
            title={!ffa ? "Key System is currently ACTIVE" : "Public FFA Mode active"}
          >
            {!ffa ? <Lock size={14} /> : <Unlock size={14} />}
            {!ffa ? "Key System: Enabled" : "Key System: Disabled (FFA)"}
          </button>
          <Link
            to="/dashboard/keys"
            className="btn-outline flex items-center gap-1.5 text-sm"
            title="Manage License Keys"
          >
            <Key size={14} /> Keys
          </Link>
          <button
            type="button"
              className="btn-outline border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5"
            onClick={() => protectMutation.mutate()}
            disabled={protectMutation.isPending || !code.trim()}
            title="Auto-obfuscate source code with multi-layer bytecode VM"
          >
            <Zap
              size={14}
              className={
                  protectMutation.isPending ? "animate-spin text-primary" : "text-primary"
              }
            />
            {protectMutation.isPending ? "Obfuscating…" : "Auto Obfuscate"}
          </button>
          <button className="btn-outline" onClick={downloadSource}>
            <Download size={15} /> Export
          </button>
          <button
            className="btn-primary"
            onClick={() => saveMutation.mutate()}
            disabled={!canSave || saveMutation.isPending}
          >
            <Save size={15} /> {saveMutation.isPending ? "Saving…" : "Save source"}
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        <Metric label="Source" value={`${code.length.toLocaleString()} chars`} />
        <Metric label="Runs" value={String(script?.run_count ?? 0)} />
        <Metric label="Access" value={ffa ? "Public (FFA)" : "Key System (Protected)"} />
        <Metric
          label="Protection"
          value={
            script?.obfuscated_code
              ? `${(script.obfuscated_code as string).length.toLocaleString()} chars (VM)`
              : script?.is_protected
                ? "Active"
                : "Source"
          }
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="landing-instrument">
          <div className="instrument-topbar">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditorView("source")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  editorView === "source"
                    ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="status-dot" /> source.lua
              </button>
              <button
                type="button"
                onClick={() => setEditorView("obfuscated")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  editorView === "obfuscated"
                    ? "bg-primary/20 text-primary border border-primary/30 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                  <ShieldCheck size={13} className="text-primary" />
                <span>obfuscated.lua</span>
                {script?.obfuscated_code && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-primary/20 text-primary">
                    VM
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {editorView === "obfuscated" && script?.obfuscated_code && (
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(script.obfuscated_code as string);
                    setStatus("OK Obfuscated bytecode VM copied to clipboard");
                  }}
                  className="btn-ghost text-xs flex items-center gap-1"
                >
                  <Clipboard size={13} /> Copy Output
                </button>
              )}
              {editorView === "source" && (
                <label className="btn-ghost cursor-pointer text-xs">
                  <Upload size={14} /> Upload
                  <input
                    type="file"
                    accept=".lua,.luau,.txt,text/plain"
                    className="hidden"
                    onChange={(event) => {
                      void readFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {editorView === "source" ? (
            <textarea
              className="min-h-[560px] w-full resize-y border-0 bg-input p-5 font-mono text-sm leading-6 text-foreground outline-none"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              spellCheck={false}
              placeholder="Paste your Lua or Luau source here"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void readFile(event.dataTransfer.files?.[0]);
              }}
            />
          ) : (
            <div className="min-h-[560px] w-full bg-black/80 p-5 font-mono text-xs leading-5 text-primary/90 overflow-auto select-all border-b border-border/30">
              {script?.obfuscated_code ? (
                <pre className="whitespace-pre-wrap break-all">
                  {script.obfuscated_code as string}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                  <ShieldCheck size={36} className="text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    No Obfuscated Bytecode Generated Yet
                  </p>
                  <p className="text-xs max-w-sm mt-1 mb-4">
                    Click "Auto Obfuscate" to compile your source code into LuaMore's polymorphic
                    Register VM with anti-tamper shields.
                  </p>
                  <button
                    type="button"
                    onClick={() => protectMutation.mutate()}
                    disabled={protectMutation.isPending || !code.trim()}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <Zap size={14} />{" "}
                    {protectMutation.isPending ? "Obfuscating…" : "Auto Obfuscate Now"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="instrument-footer">
            <span>
              {editorView === "source"
                ? `${code.length.toLocaleString()} characters (source)`
                : `${((script?.obfuscated_code as string) || "").length.toLocaleString()} characters (protected VM)`}
            </span>
            <span>Original source retained</span>
            <span>
              {script?.updated_at
                ? `Saved ${new Date(script.updated_at as string).toLocaleString()}`
                : "Not saved"}
            </span>
          </div>
          <div className="mt-4">
            <LuaTerminalSandbox
              code={(script?.obfuscated_code as string) || code}
              title="Live In-Browser Execution Sandbox"
              subtitle="Run and test this script right now — simulates Roblox Player, print, math, and tables"
            />
          </div>
        </section>

        <aside className="space-y-5">
          {/* Hosted Loader Box with Key System & FFA switchers */}
          <section className="border border-border bg-card p-5 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-primary" />
                <h2 className="font-display text-lg">Execution & Loader</h2>
              </div>
              <span className="text-[10px] font-mono uppercase bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded">
                Roblox Ready
              </span>
            </div>

            {/* Loader Type Selector Tabs */}
            <div className="mt-4 grid grid-cols-3 gap-1 bg-input p-1 rounded-md border border-border">
              <button
                type="button"
                onClick={() => setLoaderTab("standalone")}
                className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded transition-colors ${
                  loaderTab === "standalone"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                }`}
                title="100% Offline Standalone Script (No HTTP needed)"
              >
                <Zap size={12} /> Standalone
              </button>
              <button
                type="button"
                onClick={() => setLoaderTab("keysystem")}
                className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded transition-colors ${
                  loaderTab === "keysystem"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                }`}
              >
                <Key size={12} /> Key System
              </button>
              <button
                type="button"
                onClick={() => setLoaderTab("ffa")}
                className={`flex items-center justify-center gap-1 py-1.5 text-[11px] font-semibold rounded transition-colors ${
                  loaderTab === "ffa"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                }`}
              >
                <Unlock size={12} /> Web Loader
              </button>
            </div>

            {loaderTab === "standalone" && (
              <div className="mt-2.5 px-2.5 py-1.5 rounded text-[11px] border border-primary/30 bg-primary/10 text-primary flex items-center gap-1.5">
                <Check size={13} className="shrink-0" />
                <span>100% Offline · Paste directly into Delta, Solara, Wave, Codex, Arceus X</span>
              </div>
            )}

            {loaderTab === "keysystem" && (
              <div className="mt-3">
                <label className="text-[11px] text-muted-foreground block mb-1">
                  Sample License Key:
                </label>
                <input
                  type="text"
                  value={sampleKey}
                  onChange={(e) => setSampleKey(e.target.value)}
                  className="input-blue text-xs font-mono py-1 px-2 h-7"
                  placeholder="eggbm6ywzw7k3l1iht1lmeb5"
                />
              </div>
            )}

              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all border border-border bg-input p-3 font-mono text-xs leading-5 text-primary select-all rounded">
              {loader}
            </pre>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-primary text-xs" onClick={() => void copyLoader()}>
                {copied ? <Check size={14} /> : <Clipboard size={14} />}
                {copied ? "Copied!" : loaderTab === "standalone" ? "Copy Script" : "Copy Loader"}
              </button>
              <button
                className="btn-outline text-xs"
                onClick={() => {
                  const blob = new Blob([loader], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${name || "script"}_${loaderTab}.lua`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={14} /> Download .lua
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
              <Link
                to="/features/key-system-gui"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink size={12} /> Key System GUI Docs
              </Link>
              <Link to="/dashboard/keys" className="text-muted-foreground hover:text-foreground">
                Manage Keys →
              </Link>
            </div>
          </section>

          <section className="border border-border bg-card p-5 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <h2 className="font-display text-lg">Protection Engine</h2>
              </div>
              <span className="text-[10px] font-mono uppercase bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded">
                LuaMore VM
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Compiles Luau source into a polymorphic register-based Virtual Machine with dynamic
              opcode dispatch and anti-tamper shields.
            </p>

            {script?.obfuscated_code ? (
              <div className="mt-3 bg-primary/10 border border-primary/30 text-primary p-3 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold">
                  <span>Protected build active</span>
                  <span className="font-mono">
                    {(script.obfuscator as string) || "LuaMore VM v7"}
                  </span>
                </div>
                <div className="text-[11px] text-primary/80 font-mono">
                  Payload: {(script.obfuscated_code as string).length.toLocaleString()} chars ·
                   3-Layer RLE + XOR + Base85
                </div>
              </div>
            ) : (
              <div className="mt-3 bg-muted/40 border border-border p-3 rounded-lg text-xs text-muted-foreground">
                No obfuscated bytecode generated yet. Click below to compile and protect this
                script.
              </div>
            )}

            <label className="mt-4 flex items-center justify-between gap-4 border-y border-border py-3 text-sm cursor-pointer">
              <span className="flex items-center gap-1.5">
                  <Zap size={14} className="text-primary" /> Auto-obfuscate on save
              </span>
              <input
                type="checkbox"
                checked={autoProtect}
                onChange={(event) => setAutoProtect(event.target.checked)}
                className="rounded text-primary focus:ring-0 cursor-pointer"
              />
            </label>
            <button
              className="btn-primary mt-4 w-full flex items-center justify-center gap-2"
              onClick={() => protectMutation.mutate()}
              disabled={protectMutation.isPending || !code.trim()}
            >
              {protectMutation.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
                  Compiling Protected loader…
                </>
              ) : (
                <>
                  <Zap size={15} className="text-primary" />  Auto-Obfuscate Source Code
                </>
              )}
            </button>
          </section>

          <section className="space-y-4 border border-border bg-card p-5 rounded-lg">
            <Field label="Description">
              <textarea
                className="input-blue min-h-20 resize-y"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>
            <Field label="Category">
              <input
                className="input-blue"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </Field>
            <Field label="Tags">
              <input
                className="input-blue"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="utility, premium"
              />
            </Field>
            <label className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <div>
                <span className="font-medium block">Free-for-all (FFA) access</span>
                <span className="text-xs text-muted-foreground">
                  Allow execution without license keys
                </span>
              </div>
              <input
                type="checkbox"
                checked={ffa}
                onChange={(event) => {
                  const val = event.target.checked;
                  setFfa(val);
                  setLoaderTab(val ? "ffa" : "keysystem");
                }}
              />
            </label>
          </section>
        </aside>
      </div>

      {status && (
        <div
          className={`mt-5 border px-4 py-3 text-sm rounded ${status.startsWith("OK ") ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
        >
          {status}
        </div>
      )}
      <section className="mt-10 border-t border-border pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow">History</div>
            <h2 className="mt-2 font-display text-2xl">Protected releases</h2>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {query.data?.releases.length ?? 0} releases
          </span>
        </div>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {(query.data?.releases.length ?? 0) === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">
              No release snapshots yet. Your current protected output is still preserved on the
              script.
            </div>
          ) : (
            query.data?.releases.map((release) => (
              <div key={release.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <div className="font-medium">Version {release.version}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {release.note || "Protected build"}
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Date(release.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <div className="font-display text-lg">{value}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {children}
    </label>
  );
}
