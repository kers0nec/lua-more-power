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
      <span
        className="flex shrink-0 items-center justify-center rounded-md bg-primary font-mono font-bold text-primary-foreground select-none transition-transform hover:scale-105 shadow-sm"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(13, Math.round(size * 0.44)),
        }}
      >
        &#123;&#125;
      </span>
      {showText && (
        <span className="select-none font-mono text-lg font-bold tracking-tight text-foreground">
          Lua<span className="text-primary">More</span>
        </span>
      )}
    </div>
  );
}
