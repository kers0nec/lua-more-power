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
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { getScript, obfuscateScriptNow, updateScript } from "@/lib/scripts.functions";

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
  const script = query.data?.script;

  useEffect(() => {
    if (!script || hydratedId === script.id) return;
    setCode(script.code ?? "");
    setName(script.name ?? "");
    setDescription(script.description ?? "");
    setCategory(script.category ?? "");
    setTags((script.tags ?? []).join(", "));
    setFfa(script.ffa ?? false);
    setAutoProtect(script.is_protected ?? false);
    setHydratedId(script.id);
  }, [script, hydratedId]);

  const loader = useMemo(() => {
    if (!script) return "";
    const url = `https://luamore.app/scripts/hosted/${script.public_id}.lua`;
    return script.ffa
      ? `loadstring(game:HttpGet("${url}"))()`
      : `script_key = "YOUR_KEY_HERE"\nloadstring(game:HttpGet("${url}"))()`;
  }, [script]);
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
      setStatus(autoProtect ? "✓ Source saved and protection rebuilt" : "✓ Source saved");
      queryClient.invalidateQueries({ queryKey: ["script", id] });
      queryClient.invalidateQueries({ queryKey: ["scripts"] });
    },
    onError: (error) =>
      setStatus(`✗ ${error instanceof Error ? error.message : "Could not save source"}`),
  });
  const protectMutation = useMutation({
    mutationFn: () => protect({ data: { id } }),
    onSuccess: (result) => {
      setStatus(`✓ Protected output generated · ${result.size.toLocaleString()} characters`);
      setAutoProtect(true);
      queryClient.invalidateQueries({ queryKey: ["script", id] });
    },
    onError: (error) =>
      setStatus(`✗ ${error instanceof Error ? error.message : "Protection failed"}`),
  });

  async function readFile(file?: File) {
    if (!file) return;
    try {
      const text = await file.text();
      setCode(text);
      setStatus(`✓ Loaded ${file.name} · save to keep it`);
    } catch {
      setStatus("✗ Could not read that file");
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
              <span className="font-mono font-semibold tracking-widest text-blue-300 bg-[#161f38] border border-blue-500/30 px-3 py-0.5 rounded-full text-xs select-all shadow-inner">
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
        <div className="flex flex-wrap gap-2">
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
        <Metric label="Runs" value={String(script.run_count ?? 0)} />
        <Metric label="Access" value={ffa ? "Public" : "Keyed"} />
        <Metric label="Protection" value={script.is_protected ? "Active" : "Source"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="landing-instrument">
          <div className="instrument-topbar">
            <span className="flex items-center gap-2">
              <span className="status-dot" /> source.lua
            </span>
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
          </div>
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
          <div className="instrument-footer">
            <span>{code.length.toLocaleString()} characters</span>
            <span>Original source retained</span>
            <span>
              {script.updated_at
                ? `Saved ${new Date(script.updated_at).toLocaleString()}`
                : "Not saved"}
            </span>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Code2 size={16} className="text-primary" />
              <h2 className="font-display text-lg">Hosted loader</h2>
            </div>
            <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap break-all border border-border bg-input p-3 font-mono text-xs leading-5 text-muted-foreground">
              {loader}
            </pre>
            <button className="btn-outline mt-3 w-full" onClick={() => void copyLoader()}>
              {copied ? <Check size={15} /> : <Clipboard size={15} />}{" "}
              {copied ? "Copied" : "Copy loadstring"}
            </button>
          </section>
          <section className="border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" />
              <h2 className="font-display text-lg">Protection</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Build protected output from the saved source without replacing the original.
            </p>
            <label className="mt-4 flex items-center justify-between gap-4 border-y border-border py-3 text-sm">
              <span>Protect on every save</span>
              <input
                type="checkbox"
                checked={autoProtect}
                onChange={(event) => setAutoProtect(event.target.checked)}
              />
            </label>
            <button
              className="btn-primary mt-4 w-full"
              onClick={() => protectMutation.mutate()}
              disabled={protectMutation.isPending || !code.trim()}
            >
              {protectMutation.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />{" "}
                  Protecting…
                </>
              ) : (
                <>
                  <ShieldCheck size={15} /> Protect script
                </>
              )}
            </button>
          </section>
          <section className="space-y-4 border border-border bg-card p-5">
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
              <span>Free-for-all access</span>
              <input
                type="checkbox"
                checked={ffa}
                onChange={(event) => setFfa(event.target.checked)}
              />
            </label>
          </section>
        </aside>
      </div>

      {status && (
        <div
          className={`mt-5 border px-4 py-3 text-sm ${status.startsWith("✓") ? "border-success/40 bg-success/10 text-success" : "border-destructive/40 bg-destructive/10 text-destructive"}`}
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
