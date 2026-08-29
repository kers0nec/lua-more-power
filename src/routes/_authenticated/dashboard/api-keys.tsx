import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createApiKey, deleteApiKey, listApiKeys } from "@/lib/api-keys.functions";
import { Copy, Check, Key, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — LuaMore" }] }),
  component: Page,
});

function Page() {
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const del = useServerFn(deleteApiKey);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["api-keys"], queryFn: () => list() });
  const [label, setLabel] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMut = useMutation({
    mutationFn: () => create({ data: { label: label.trim() || "discord-bot" } }),
    onSuccess: (r) => {
      setNewKey(r.key);
      setLabel("");
      toast.success("API key generated successfully!");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create API key");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("API key revoked");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to revoke API key");
    },
  });

  const copyKey = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied API key to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy automatically. Please highlight and copy.");
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Used by the Discord <code className="text-foreground">/login</code> command, REST API,
            and CLI/loader integrations.
          </p>
        </div>
      </div>

      <div className="card-blue p-5 mt-6 flex flex-wrap items-end gap-3 border border-border/40">
        <div className="flex-1 min-w-64">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Key Label
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !createMut.isPending) {
                createMut.mutate();
              }
            }}
            className="input-blue mt-1 w-full"
            placeholder="e.g. discord-bot"
          />
        </div>
        <button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {createMut.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            "Generate Key"
          )}
        </button>
      </div>

      {newKey && (
        <div className="mt-4 card-blue p-5 border border-emerald-500/30 bg-emerald-500/10">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-emerald-400">
              Copy your new API key now (use in Discord: <code>/login api_key:{newKey}</code>):
            </div>
            <button
              onClick={() => copyKey(newKey)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 font-mono text-sm p-3 rounded-lg bg-black/40 border border-border/40 select-all overflow-x-auto text-emerald-300">
              {newKey}
            </code>
          </div>
        </div>
      )}

      <div className="mt-6 card-blue divide-y border border-border/40">
        {(q.data ?? []).map((k) => (
          <div key={k.id} className="p-4 flex items-center gap-3">
            <div>
              <div className="font-semibold text-sm">{k.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Prefix: <span className="font-mono text-foreground">{k.prefix}••••••</span> ·
                Created {new Date(k.created_at).toLocaleString()}
                {k.last_used_at && (
                  <span> · Last used {new Date(k.last_used_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => {
                if (
                  confirm("Revoke this API key? Any bots or scripts using it will lose access.")
                ) {
                  delMut.mutate(k.id);
                }
              }}
              disabled={delMut.isPending}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Revoke key"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {q.data && q.data.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No API keys created yet. Enter a label above and click <strong>Generate Key</strong>.
          </div>
        )}
      </div>
    </div>
  );
}
