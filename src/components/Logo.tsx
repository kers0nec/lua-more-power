export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center font-display"
        style={{
          width: size,
          height: size,
          background: "var(--foreground)",
          color: "#ffffff",
          fontSize: size * 0.6,
          borderRadius: size * 0.25,
          lineHeight: 1,
          paddingBottom: size * 0.05,
        }}
      >
        <span style={{ fontStyle: "italic" }}>L</span>
      </div>
      <span
        className="font-display text-xl tracking-tight"
        style={{ color: "var(--foreground)" }}
      >
        Lua<span style={{ fontStyle: "italic", color: "var(--primary)" }}>More</span>
      </span>
    </div>
  );
}
