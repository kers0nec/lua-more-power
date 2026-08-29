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
      className="rounded-lg border p-4 space-y-3"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <label className="flex items-start gap-3 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Verify you are human</span>
          <span className="block text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Check the box and solve the challenge to continue.
          </span>
        </span>
      </label>
      <div>
        <label className="eyebrow">
          {pair ? `What is ${pair[0]} + ${pair[1]}?` : "Loading challenge…"}
        </label>
        <input
          inputMode="numeric"
          value={answer}
          onChange={(e) => setAnswer(e.target.value.replace(/[^\d]/g, ""))}
          className="input-blue mt-2 max-w-[8rem]"
          placeholder="Answer"
          autoComplete="off"
          disabled={!pair}
        />
      </div>
      {value ? (
        <p className="text-xs" style={{ color: "var(--success)" }}>
          Verified
        </p>
      ) : null}
    </div>
  );
}
