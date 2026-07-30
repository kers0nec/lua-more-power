export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center font-mono font-bold"
        style={{
          width: size,
          height: size,
          background: "var(--foreground)",
          color: "var(--background)",
          fontSize: size * 0.38,
          borderRadius: size * 0.22,
          letterSpacing: "-0.06em",
        }}
      >
        LM
      </div>
      <span
        className="font-display text-lg font-bold tracking-tight"
        style={{ color: "var(--foreground)" }}
      >
        Lua<span style={{ color: "var(--muted-foreground)" }}>More</span>
      </span>
    </div>
  );
}
