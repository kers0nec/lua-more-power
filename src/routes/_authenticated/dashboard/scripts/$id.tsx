import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getScript, updateScript, obfuscateScriptNow } from "@/lib/scripts.functions";

export const Route = createFileRoute("/_authenticated/dashboard/scripts/$id")({
  head: () => ({ meta: [{ title: "Script — LuaMore" }] }),
  component: ScriptDetail,
});

function prettyError(e: unknown) {
  const raw = e instanceof Error ? e.message : String(e ?? "Failed");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((i: { code?: string; message?: string; path?: (string | number)[] }) =>
          i.code === "too_big" && i.path?.[0] === "code"
            ? "Script is too large to save"
            : `${i.path?.join(".") ?? "input"}: ${i.message ?? "invalid"}`,
        )
        .join(", ");
    }
  } catch {
    /* not JSON */
  }
  return raw;
}

function ScriptDetail() {
  const { id } = Route.useParams();
  const get = useServerFn(getScript);
  const upd = useServerFn(updateScript);
  const obf = useServerFn(obfuscateScriptNow);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["script", id], queryFn: () => get({ data: { id } }) }) as { data?: { script?: any; releases?: any[] } };
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [ffa, setFfa] = useState(false);
  const [autoObf, setAutoObf] = useState(false);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (q.data?.script) {
      setCode(q.data.script.code ?? "");
      setName(q.data.script.name ?? "");
      setFfa(q.data.script.ffa ?? false);
      setAutoObf(q.data.script.is_protected ?? false);
    }
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: () => upd({ data: { id, name, code, ffa, is_protected: autoObf } }),
    onSuccess: () => {
      setStatus(autoObf ? "✓ Saved & obfuscated" : "✓ Saved");
      qc.invalidateQueries({ queryKey: ["script", id] });
    },
    onError: (e) => setStatus(`✗ ${prettyError(e)}`),
  });

  const obfMut = useMutation({
    mutationFn: () => obf({ data: { id } }),
    onSuccess: (r) => {
      setStatus(`✓ Obfuscated (${r.size.toLocaleString()} chars, LuaMore VM v6)`);
      qc.invalidateQueries({ queryKey: ["script", id] });
    },
    onError: (e) => setStatus(`✗ ${prettyError(e)}`),
  });

  const onUpload = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      setCode(text);
      setStatus(`✓ Loaded ${file.name} (${text.length.toLocaleString()} chars) — press Save`);
    } catch {
      setStatus("✗ Could not read that file");
    }
  };

  const script = q.data?.script;
  const releases = q.data?.releases ?? [];

  return (
    <div className="p-8 max-w-6xl">
      <Link to="/dashboard/scripts" className="text-sm" style={{ color: "var(--primary)" }}>
        ← All scripts
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-blue text-xl font-bold max-w-md"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ffa} onChange={(e) => setFfa(e.target.checked)} /> FFA
        </label>
        <label
          className="flex items-center gap-2 text-sm"
          title="Automatically re-obfuscate with the LuaMore VM v6 every time you save"
        >
          <input type="checkbox" checked={autoObf} onChange={(e) => setAutoObf(e.target.checked)} />
          Auto-obfuscate on save
        </label>
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="btn-outline"
        >
          Save
        </button>
        <button onClick={() => obfMut.mutate()} disabled={obfMut.isPending} className="btn-primary">
          {obfMut.isPending ? "Obfuscating…" : "Obfuscate now"}
        </button>
      </div>
      {script && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge-blue">public id: {script.public_id}</span>
            <span className="badge-blue">{script.ffa ? "FFA (no key)" : "Key required"}</span>
            {script.is_protected && <span className="badge-blue">Protected</span>}
          </div>
          <LoadstringBox script={script} />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => obfMut.mutate()}
              disabled={obfMut.isPending}
              className="btn-primary relative"
            >
              {obfMut.isPending ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Protecting…
                </span>
              ) : (
                "Protect script"
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="card-blue p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
              SOURCE CODE (Luau)
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
            placeholder="Paste your Luau code, or drop a .lua file here"
            className="input-blue font-mono text-sm h-[420px] resize-none"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="btn-primary"
            >
              {saveMut.isPending ? "Saving…" : "Save changes"}
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
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Release history</h2>
        <div className="mt-3 card-blue divide-y">
          {releases.length === 0 && (
            <div className="p-6 text-sm text-center" style={{ color: "var(--muted-foreground)" }}>
              No releases yet
            </div>
          )}
          {releases.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">v{r.version}</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(r.created_at).toLocaleString()} · {r.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
