import { useEffect, useRef, useState } from "react";

const DB_MIN = -77;

function toPercent(db: number): number {
  return Math.max(0, Math.min(100, ((db - DB_MIN) / -DB_MIN) * 100));
}

interface VUMeterProps {
  level: number;    // dBFS -60..0
  color?: string;   // opcjonalne nadpisanie koloru (dla vintage)
  bg?: string;
}

export const VUMeter = ({ level, color, bg }: VUMeterProps) => {
  const [peak, setPeak] = useState(DB_MIN);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (level > peak) {
      setPeak(level);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPeak(DB_MIN), 2000);
    }
  }, [level, peak]);

  const pct     = toPercent(level);
  const peakPct = toPercent(peak);
  const barColor = color ?? (level >= 0 ? "#ef4444" : level >= -6 ? "#eab308" : "#22c55e");

  return (
    <div
      className="relative flex-shrink-0 rounded-sm overflow-visible"
      style={{ width: 5, height: 200, background: bg ?? "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: `${pct}%`, background: barColor, transition: "height 55ms linear" }}
      />
      {peak > DB_MIN + 2 && (
        <div
          className="absolute left-0 right-0 h-px"
          style={{ bottom: `${peakPct}%`, background: barColor }}
        />
      )}
    </div>
  );
};
