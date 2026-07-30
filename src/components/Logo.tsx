export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-lg font-bold"
        style={{
          width: size,
          height: size,
          background: "#ffffff",
          color: "#09090b",
          fontSize: size * 0.42,
          letterSpacing: "-0.02em",
        }}
      >
        LM
      </div>
      <span className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
        Lua<span style={{ color: "var(--muted-foreground)" }}>More</span>
      </span>
    </div>
  );
}
