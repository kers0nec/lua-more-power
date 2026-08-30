import iconAsset from "@/assets/luamore-icon.webp.asset.json";

export function Logo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center overflow-hidden shrink-0 transition-transform hover:scale-105"
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          boxShadow: "0 0 20px rgba(59, 130, 246, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
        }}
      >
        <img
          src={iconAsset.url}
          alt="LuaMore"
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      </div>
      {showText && (
        <span
          className="font-display text-2xl tracking-tight font-bold select-none"
          style={{ color: "var(--foreground)" }}
        >
          Lua<span style={{ color: "var(--primary)" }}>More</span>
        </span>
      )}
    </div>
  );
}
