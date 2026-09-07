import { useEffect, useState } from "react";

export function HumanCheck({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (ok: boolean) => void;
}) {
  const [pair, setPair] = useState<[number, number] | null>(null);
  const [checked, setChecked] = useState(false);
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    const x = 2 + Math.floor(Math.random() * 8);
    const y = 2 + Math.floor(Math.random() * 8);
    setPair([x, y]);
  }, []);

  const ok = Boolean(pair && checked && Number(answer) === pair[0] + pair[1]);

  useEffect(() => {
    onChange(ok);
  }, [ok, onChange]);

  return (
    <div
      className="rounded-xl border p-4 space-y-3.5 transition-all"
      style={{
        borderColor: ok ? "rgba(163, 230, 53, 0.4)" : "var(--border)",
        background: "linear-gradient(180deg, rgba(10, 20, 10, 0.6) 0%, rgba(6, 14, 10, 0.8) 100%)",
        boxShadow: ok ? "0 0 15px rgba(163, 230, 53, 0.15)" : "none",
      }}
    >
      <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 accent-lime-500 rounded cursor-pointer"
        />
        <span>
          <span className="font-semibold text-white tracking-tight flex items-center gap-2">
            Human Verification
            {value && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-400 font-normal">
                Passed
              </span>
            )}
          </span>
          <span className="block text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Check the box and enter the challenge sum to proceed.
          </span>
        </span>
      </label>

      <div className="pt-1">
        <label className="eyebrow block">
          {pair
            ? `Security Challenge: What is ${pair[0]} + ${pair[1]}?`
            : "Generating security challenge…"}
        </label>
        <div className="flex items-center gap-2 mt-2">
          <input
            inputMode="numeric"
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/[^\d]/g, ""))}
            className="input-blue max-w-[9rem] text-center font-mono font-semibold"
            placeholder="Sum"
            autoComplete="off"
            disabled={!pair}
          />
          {value && (
            <span className="text-xs font-semibold text-lime-400 flex items-center gap-1">
              Verified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
