import { useState, useEffect, useRef } from "react";

interface PanKnobProps {
  value: number; // 0-100, where 50 is center
  onChange: (value: number) => void;
}

const isTouchDevice =
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const PanKnob = ({ value, onChange }: PanKnobProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const prevY          = useRef(0);
  const lastTap        = useRef(0);
  const knobRef        = useRef<HTMLDivElement>(null);
  const touchStartX    = useRef(0);
  const touchStartVal  = useRef(0);
  const valueRef       = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const rotation = ((value - 50) / 50) * 135;

  /* ── Desktop: mouse drag (vertical) ── */
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dy = prevY.current - e.clientY;
      prevY.current = e.clientY;
      onChange(Math.min(100, Math.max(0, valueRef.current + dy * 0.8)));
    };
    const handleEnd = () => { setIsDragging(false); document.body.style.cursor = ""; };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
    };
  }, [isDragging, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isTouchDevice) return;
    setIsDragging(true);
    prevY.current = e.clientY;
    document.body.style.cursor = "ew-resize";
  };

  /* ── Mobile: native touchstart (passive:false) to block scroll ── */
  useEffect(() => {
    if (!isTouchDevice) return;
    const el = knobRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // blokuje scroll ekranu
      const now = Date.now();
      if (now - lastTap.current < 300) {
        onChange(50);
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
      touchStartX.current   = e.touches[0].clientX;
      touchStartVal.current = valueRef.current;
      setIsDragging(true);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => el.removeEventListener("touchstart", onTouchStart);
  }, [onChange]);

  /* ── Mobile: touchmove horizontal ── */
  useEffect(() => {
    if (!isTouchDevice || !isDragging) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const dx = e.touches[0].clientX - touchStartX.current;
      onChange(Math.min(100, Math.max(0, touchStartVal.current + dx * 0.8)));
    };
    const onTouchEnd = () => setIsDragging(false);

    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, onChange]);

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-console-beige/40 pointer-events-none" />
      <div className="absolute top-[25%] left-[15%] w-0.5 h-1 bg-console-beige/20 -rotate-45 pointer-events-none" />
      <div className="absolute top-[25%] right-[15%] w-0.5 h-1 bg-console-beige/20 rotate-45 pointer-events-none" />

      <div
        ref={knobRef}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.1)] border border-black relative z-10"
        style={{
          transform: `rotate(${rotation}deg)`,
          touchAction: "none",
          cursor: isTouchDevice ? "default" : "ew-resize",
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => !isTouchDevice && onChange(50)}
      >
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-white rounded-full shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none" />
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default PanKnob;
