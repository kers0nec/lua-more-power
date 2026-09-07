import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import {
  FileCode2,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  Key,
  Globe,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
  Code2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  createScript,
  deleteScript,
  listScripts,
  obfuscateSourceCode,
} from "@/lib/scripts.functions";
import { DashboardHeader } from "@/components/DashboardHeader";

interface DashboardScriptItem {
  id: string;
  name: string;
  public_id: string;
  ffa?: boolean;
  code?: string;
  description?: string;
  category?: string;
  tags?: string[];
  is_protected?: boolean;
  created_at?: string;
  run_count?: number;
}

export const Route = createFileRoute("/_authenticated/dashboard/scripts/")({
  head: () => ({ meta: [{ title: "Scripts — LuaMore" }] }),
  component: Scripts,
});

function Scripts() {
  const list = useServerFn(listScripts);
  const create = useServerFn(createScript);
  const del = useServerFn(deleteScript);
  const qc = useQueryClient();
  const scripts = useQuery({ queryKey: ["scripts"], queryFn: () => list() }) as {
    data?: DashboardScriptItem[];
  };

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [ffa, setFfa] = useState(false);
  const [code, setCode] = useState("");
  const [autoObfuscate, setAutoObfuscate] = useState(true);
  const [obfStats, setObfStats] = useState<{
    size: number;
    entropy: number;
    layers: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const obfFn = useServerFn(obfuscateSourceCode);
  const obfDirectMut = useMutation({
    mutationFn: (src: string) => obfFn({ data: { code: src } }),
    onSuccess: (res) => {
      setObfStats({ size: res.size, entropy: res.entropy, layers: res.layers });
      setAutoObfuscate(true);
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Obfuscation failed"),
  });

  const createMut = useMutation({
    mutationFn: (v: {
      name: string;
      ffa: boolean;
      description?: string;
      category?: string;
      tags?: string[];
      code?: string;
      autoObfuscate?: boolean;
    }) => create({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scripts"] });
      setName("");
      setDescription("");
      setCategory("");
      setTags("");
      setCode("");
      setFfa(false);
      setAutoObfuscate(true);
      setObfStats(null);
      setErr(null);
      setShowCreate(false);
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed to create script"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });

  const copyLoader = (s: DashboardScriptItem) => {
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://luamore.app";
    const loaderCode = s.ffa
      ? `-- LuaMore Universal Loader (${s.name || "script"})
local s, r = pcall(function() return game:HttpGet("${origin}/files/loaders/${s.public_id}.lua") end)
if s and r and not r:find("<html") then loadstring(r)() else warn("[LuaMore] Loader unreachable. Check URL or use Standalone Script.") end`
      : `-- LuaMore Key Protected Loader (${s.name || "script"})
script_key = "YOUR_KEY";
local s, r = pcall(function() return game:HttpGet("${origin}/files/loaders/${s.public_id}.lua") end)
if s and r and not r:find("<html") then loadstring(r)() else warn("[LuaMore] Loader unreachable. Check URL or use Standalone Script.") end`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(loaderCode);
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const allScripts = scripts.data ?? [];
  const categories = Array.from(
    new Set(allScripts.map((s) => s.category).filter(Boolean)),
  ) as string[];

  const filteredScripts = allScripts.filter((s) => {
    const matchesSearch =
      !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.public_id?.toLowerCase().includes(search.toLowerCase()) ||
      (s.tags && s.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())));

    const matchesCat = selectedCat === "all" || s.category === selectedCat;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="app-page">
      <DashboardHeader
        eyebrow="Projects"
        title="Hosted Scripts"
        description="Deploy Luau code behind auto-configured hosted loaders with instant key & hardware enforcement."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus size={14} /> {showCreate ? "Close Form" : "New Script"}
            </button>
          </div>
        }
      />

      {/* Creation Modal / Accordion */}
      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMut.mutate({
              name: name.trim(),
              ffa,
              autoObfuscate,
              description: description.trim() || undefined,
              category: category.trim() || undefined,
              tags: tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
              code: code.trim() || undefined,
            });
          }}
          className="mt-6 rounded-xl border border-primary/40 bg-card p-6 shadow-xl grid gap-4 md:grid-cols-2 relative overflow-hidden"
        >
          <div className="md:col-span-2 flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Code2 size={18} className="text-primary" />
              <h3 className="text-base font-semibold text-foreground">Create New Hosted Script</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              Endpoint: <span className="text-primary font-mono">https://luamore.app</span>
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">SCRIPT NAME *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-blue mt-1"
              placeholder="Universal Combat Hub"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">CATEGORY</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-blue mt-1"
              placeholder="PVP, Utility, Simulator…"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">DESCRIPTION</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-blue mt-1"
              placeholder="Short description displayed on your Discord bot panel"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">
              TAGS (COMMA SEPARATED)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input-blue mt-1"
              placeholder="roblox, hub, combat"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">ACCESS MODEL</label>
            <div className="mt-1 flex items-center gap-3 h-10 px-3 rounded-lg border border-border bg-input">
              <label className="flex items-center gap-2 text-xs cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={ffa}
                  onChange={(e) => setFfa(e.target.checked)}
                  className="rounded text-primary focus:ring-0"
                />
                <span>Free For All (Public Loader)</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <label className="text-xs font-semibold text-muted-foreground">
                INITIAL LUAU SOURCE (optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoObfuscate}
                    onChange={(e) => setAutoObfuscate(e.target.checked)}
                    className="rounded text-primary focus:ring-0"
                  />
                  <ShieldCheck size={13} className="text-primary" />
                  <span>Auto-Obfuscate Source</span>
                </label>
                <button
                  type="button"
                  onClick={() => code.trim() && obfDirectMut.mutate(code)}
                  disabled={!code.trim() || obfDirectMut.isPending}
                  className="px-2.5 py-1 text-xs font-medium rounded border border-lime-500/40 bg-lime-500/10 text-lime-300 hover:bg-lime-500/20 disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  <Zap size={12} className={obfDirectMut.isPending ? "animate-spin" : ""} />
                  {obfDirectMut.isPending ? "Obfuscating…" : "⚡ Obfuscate Code Now"}
                </button>
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setObfStats(null);
              }}
              className="input-blue mt-1 font-mono text-xs h-36 resize-y"
              placeholder="-- Paste Lua / Luau code here (you can also edit or upload later)&#10;print('Hello from LuaMore!')"
              spellCheck={false}
            />
            {obfStats && (
                <div className="mt-2 text-xs bg-lime-500/10 border border-lime-500/30 text-lime-300 px-3 py-1.5 rounded-md flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Multi-Layer Bytecode VM Compiled
                </span>
                <span className="font-mono text-[11px]">
                  {obfStats.size.toLocaleString()} chars · Entropy: {obfStats.entropy.toFixed(2)} ·{" "}
                  {obfStats.layers} Layer Shield
                </span>
              </div>
            )}
          </div>

          <div className="md:col-span-2 flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
            <button disabled={createMut.isPending || !name.trim()} className="btn-primary text-xs">
              <Plus size={14} />{" "}
              {createMut.isPending ? "Creating Script…" : "Create & Open Workspace"}
            </button>
          </div>
          {err && (
            <div className="text-xs text-destructive md:col-span-2 bg-destructive/10 p-2.5 rounded-md border border-destructive/20">
              {err}
            </div>
          )}
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scripts by name, tag, or public id…"
            className="input-blue pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCat("all")}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
              selectedCat === "all"
                ? "bg-primary text-primary-foreground border-primary font-semibold"
                : "bg-input text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            All ({allScripts.length})
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCat(c)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                selectedCat === c
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "bg-input text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Scripts Grid */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {filteredScripts.map((s) => {
          const isCopied = copiedId === s.id;
          return (
            <div
              key={s.id}
              className="group relative flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {s.name}
                      </h3>
                      {s.ffa ? (
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-medium bg-lime-950/80 text-lime-300 border border-lime-800 shrink-0">
                          FFA Public
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-medium bg-lime-950/80 text-lime-300 border border-lime-800 shrink-0">
                          Key Protected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {s.description || "No description provided."}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Delete "${s.name}"? This action cannot be undone.`)) {
                        delMut.mutate(s.id);
                      }
                    }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    aria-label={`Delete ${s.name}`}
                    title="Delete script"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Metadata tags & public ID */}
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md select-all">
                    {s.public_id}
                  </span>
                  {s.category && (
                    <span className="text-[10px] bg-input border border-border text-muted-foreground px-2 py-0.5 rounded-md">
                      {s.category}
                    </span>
                  )}
                  {(s.tags ?? []).map((t: string) => (
                    <span
                      key={t}
                      className="text-[10px] bg-input border border-border text-muted-foreground px-1.5 py-0.5 rounded-md"
                    >
                      #{t}
                    </span>
                  ))}
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                    {s.code ? `${s.code.length.toLocaleString()} chars` : "0 chars"}
                  </span>
                </div>
              </div>

              {/* Bottom Action Toolbar */}
              <div className="mt-5 pt-3.5 border-t border-border/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => copyLoader(s)}
                  className="btn-outline text-xs py-1.5 px-2.5 h-8 flex items-center gap-1.5 hover:border-primary"
                  title="Copy ready-to-run loadstring"
                >
                  {isCopied ? (
                    <>
                      <Check size={12} className="text-primary" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={12} /> Copy Loadstring
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <Link
                    to="/dashboard/keys"
                    className="btn-ghost text-xs py-1.5 px-2.5 h-8 text-muted-foreground hover:text-foreground"
                  >
                    Keys
                  </Link>
                  <Link
                    to="/dashboard/scripts/$id"
                    params={{ id: s.id }}
                    className="btn-primary text-xs py-1.5 px-3 h-8 flex items-center gap-1 shadow-xs"
                  >
                    Open Workspace <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {filteredScripts.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
            <FileCode2 size={32} className="mx-auto text-muted-foreground/60" />
            <h3 className="mt-3 text-sm font-semibold text-foreground">No scripts found</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {search
                ? `No scripts matching "${search}". Try searching for something else.`
                : "You have not created any hosted scripts yet."}
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> Create Your First Script
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
