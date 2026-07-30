export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center font-display font-bold"
        style={{
          width: size,
          height: size,
          background: "var(--card)",
          border: "1px solid var(--border-strong)",
          fontSize: size * 0.4,
          borderRadius: size * 0.22,
          letterSpacing: "-0.08em",
          boxShadow: "0 0 18px rgba(26,109,255,0.35)",
        }}
      >
        <span style={{ color: "var(--primary)" }}>L</span>
        <span style={{ color: "var(--foreground)", textShadow: "0 0 10px rgba(26,109,255,0.8)" }}>M</span>
      </div>
      <span
        className="font-display text-lg font-bold tracking-tight"
        style={{ color: "var(--foreground)" }}
      >
        <span style={{ color: "var(--primary)" }}>Lua</span>More
      </span>
    </div>
  );
}
