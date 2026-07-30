export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-lg font-bold text-white"
        style={{
          width: size,
          height: size,
          background: "var(--gradient-primary)",
          fontSize: size * 0.5,
          boxShadow: "0 4px 12px rgba(0,170,255,0.35)",
        }}
      >
        LM
      </div>
      <span className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
        Lua<span style={{ color: "var(--primary)" }}>More</span>
      </span>
    </div>
  );
}
