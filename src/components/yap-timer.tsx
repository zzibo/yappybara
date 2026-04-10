"use client";

type YapTimerProps = {
  remainingMs: number;
  totalMs: number;
};

function formatTime(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function YapTimer({ remainingMs, totalMs }: YapTimerProps) {
  const warning = remainingMs <= 15_000 && remainingMs > 0;
  const expired = remainingMs === 0;
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;

  const color = expired ? "var(--yb-error)" : warning ? "var(--yb-partial)" : "var(--yb-text)";

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "2.5rem",
          fontWeight: 700,
          color,
          letterSpacing: "0.05em",
          lineHeight: 1,
          transition: "color 200ms ease",
          animation: warning ? "yap-timer-pulse 1s ease-in-out infinite" : undefined,
        }}
      >
        {formatTime(remainingMs)}
      </span>
      <div
        style={{
          width: "180px",
          height: "3px",
          borderRadius: "2px",
          backgroundColor: "var(--yb-bg-sub)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            height: "100%",
            backgroundColor: color,
            transition: "width 200ms linear, background-color 200ms ease",
          }}
        />
      </div>
      <style>{`
        @keyframes yap-timer-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
