import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Layers } from "lucide-react";
import { generateBatch } from "@/lib/keys.functions";
import { DashboardHeader } from "@/components/DashboardHeader";

export const Route = createFileRoute("/_authenticated/dashboard/batches")({
  head: () => ({ meta: [{ title: "Key Batches — LuaMore" }] }),
  component: Batches,
});

function Batches() {
  const gen = useServerFn(generateBatch);
  const [size, setSize] = useState(10);
  const [hours, setHours] = useState(24);
  const [keys, setKeys] = useState<string[]>([]);
  const mut = useMutation({
    mutationFn: () => gen({ data: { size, hours } }),
    onSuccess: (r) => setKeys(r.keys),
  });

  return (
    <div className="app-page max-w-5xl">
      <DashboardHeader
        eyebrow="Access control"
        title="Key batches"
        description="Generate up to 500 timed or permanent license keys in one operation."
        action={
          <span className="badge-blue">
            <Layers size={12} /> Bulk tools
          </span>
        }
      />

      <div className="card-blue p-5 mt-6 grid gap-3 md:grid-cols-3 items-end">
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            SIZE (max 500)
          </label>
          <input
            type="number"
            min={1}
            max={500}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="input-blue mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>
            HOURS PER KEY
          </label>
          <input
            type="number"
            min={0}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="input-blue mt-1"
          />
        </div>
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="btn-primary">
          {mut.isPending ? "Generating…" : "Generate Batch"}
        </button>
      </div>

      {keys.length > 0 && (
        <div className="card-blue p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">{keys.length} keys generated</div>
            <button
              className="btn-outline text-sm"
              onClick={() => {
                const blob = new Blob([keys.join("\n")], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `luamore_keys_${Date.now()}.txt`;
                a.click();
              }}
            >
              <Download size={14} /> Download .txt
            </button>
          </div>
          <textarea
            readOnly
            value={keys.join("\n")}
            className="input-blue font-mono text-xs h-96 resize-none"
          />
        </div>
      )}
    </div>
  );
}
