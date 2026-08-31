import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { FileCode2, Plus, Trash2 } from "lucide-react";
import { createScript, deleteScript, listScripts } from "@/lib/scripts.functions";
import { DashboardHeader } from "@/components/DashboardHeader";

export const Route = createFileRoute("/_authenticated/dashboard/scripts/")({
  head: () => ({ meta: [{ title: "Scripts — LuaMore" }] }),
  component: Scripts,
});

function Scripts() {
  const list = useServerFn(listScripts);
  const create = useServerFn(createScript);
  const del = useServerFn(deleteScript);
  const qc = useQueryClient();
  const scripts = useQuery({ queryKey: ["scripts"], queryFn: () => list() }) as { data?: any[] };
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [ffa, setFfa] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (v: {
      name: string;
      ffa: boolean;
      description?: string;
      category?: string;
      tags?: string[];
      code?: string;
    }) => create({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scripts"] });
      setName("");
      setDescription("");
      setCategory("");
      setTags("");
      setCode("");
      setFfa(false);
      setErr(null);
    },
    onError: (e) => setErr(e instanceof Error ? e.message : "Failed"),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });

  return (
    <div className="app-page">
      <DashboardHeader
        eyebrow="Projects"
        title="Scripts"
        description="Store source, configure access, and copy a stable hosted loader for every project."
        action={
          <span className="badge-blue">
            <FileCode2 size={12} /> {(scripts.data ?? []).length} total
          </span>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          createMut.mutate({
            name: name.trim(),
            ffa,
            description: description.trim() || undefined,
            category: category.trim() || undefined,
            tags: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            code: code.trim() || undefined,
          });
        }}
        className="card-blue p-5 mt-6 grid gap-3 md:grid-cols-2 items-end"
      >
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            NEW SCRIPT NAME
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-blue mt-1"
            placeholder="My Awesome Script"
          />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            CATEGORY
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-blue mt-1"
            placeholder="Duels, Hub, Utility…"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            DESCRIPTION
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-blue mt-1"
            placeholder="Shown on the Discord control panel"
          />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            TAGS (COMMA SEPARATED)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="input-blue mt-1"
            placeholder="roblox, premium"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            SOURCE (optional — you can also paste later)
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input-blue mt-1 font-mono text-sm h-32 resize-y"
            placeholder="Paste Luau here to save it with the script"
            spellCheck={false}
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ffa} onChange={(e) => setFfa(e.target.checked)} /> FFA
            (public)
          </label>
          <button disabled={createMut.isPending} className="btn-primary">
            <Plus size={15} /> {createMut.isPending ? "Creating…" : "Create script"}
          </button>
        </div>
        {err && <div className="text-sm text-[color:var(--destructive)] md:col-span-2">{err}</div>}
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(scripts.data ?? []).map((s) => (
          <div key={s.id} className="card-blue p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold truncate">{s.name}</h3>
                <p className="text-sm line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                  {s.description || "—"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="font-mono font-semibold tracking-wider text-blue-300 bg-blue-950/70 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-xs select-all">
                    {s.public_id}
                  </span>
                  {s.category && <span className="badge-blue">{s.category}</span>}
                  {s.ffa ? (
                    <span className="badge-blue bg-blue-500/20 text-blue-300 border-blue-500/40">
                      🌐 FFA (Public)
                    </span>
                  ) : (
                    <span className="badge-blue bg-amber-500/20 text-amber-300 border-amber-500/40">
                      🔑 Key System
                    </span>
                  )}
                  {!s.is_active && (
                    <span className="badge-blue text-destructive border-destructive/40">
                      Inactive
                    </span>
                  )}
                  {(s.tags ?? []).map((t: string) => (
                    <span key={t} className="badge-blue">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm(`Delete "${s.name}"?`)) delMut.mutate(s.id);
                }}
                className="btn-ghost px-2 text-destructive"
                aria-label={`Delete ${s.name}`}
                title="Delete script"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/dashboard/scripts/$id"
                params={{ id: s.id }}
                className="btn-primary text-xs"
              >
                Open Workspace
              </Link>
              <Link to="/dashboard/keys" className="btn-outline text-xs">
                Manage Keys
              </Link>
            </div>
          </div>
        ))}
        {scripts.data && scripts.data.length === 0 && (
          <div
            className="col-span-full text-center p-10"
            style={{ color: "var(--muted-foreground)" }}
          >
            No scripts yet — create your first one above.
          </div>
        )}
      </div>
    </div>
  );
}
