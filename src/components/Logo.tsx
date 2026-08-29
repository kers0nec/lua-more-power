export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center font-display"
        style={{
          width: size,
          height: size,
          background: "var(--primary)",
          color: "var(--primary-foreground)",
          fontSize: size * 0.36,
          fontWeight: 700,
          letterSpacing: "-0.06em",
          borderRadius: size * 0.25,
          lineHeight: 1,
          paddingBottom: size * 0.02,
          boxShadow: "0 0 24px rgba(59, 130, 246, 0.45)",
        }}
      >
        <span>LM</span>
      </div>
      <span className="font-display text-2xl tracking-tight" style={{ color: "var(--foreground)" }}>
        Lua<span style={{ color: "var(--primary)" }}>More</span>
      </span>
    </div>
  );
}
