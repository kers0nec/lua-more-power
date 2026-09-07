export function Logo({
  size = 32,
  showText = true,
  className = "",
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/brand/logo.png"
        alt="LuaMore"
        className="shrink-0 rounded-md shadow-sm transition-transform hover:scale-105"
        style={{
          width: size,
          height: size,
        }}
      />
      {showText && (
        <span className="select-none font-mono text-lg font-bold tracking-tight text-foreground">
          Lua<span className="text-primary">More</span>
        </span>
      )}
    </div>
  );
}
