export function Logo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="relative flex items-center justify-center overflow-hidden shrink-0 transition-transform hover:scale-105"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(145deg, #0b1e3b 0%, #060e1d 50%, #03070f 100%)",
          borderRadius: Math.round(size * 0.28),
          boxShadow: "0 0 20px rgba(59, 130, 246, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full p-[18%]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left Angle Bracket < */}
          <path
            d="M38 32L18 50L38 68"
            stroke="white"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Middle Slash / */}
          <path d="M58 22L42 78" stroke="white" strokeWidth="11" strokeLinecap="round" />
          {/* Right Angle Bracket > */}
          <path
            d="M62 32L82 50L62 68"
            stroke="white"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
