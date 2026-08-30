import iconAsset from "@/assets/luamore-icon.webp.asset.json";

export function Logo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card transition-transform hover:scale-105"
        style={{
          width: size,
          height: size,
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
          className="select-none font-display text-xl font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Lua<span style={{ color: "var(--primary)" }}>More</span>
        </span>
      )}
    </div>
  );
}
