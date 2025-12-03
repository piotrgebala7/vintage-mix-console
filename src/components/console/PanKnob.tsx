import { useState, useRef } from "react";

interface PanKnobProps {
  value: number; // -100 (L) to 100 (R), 0 = center
  onChange: (value: number) => void;
}

export const PanKnob = ({ value, onChange }: PanKnobProps) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const deltaY = startY.current - e.clientY;
    const newValue = Math.max(-100, Math.min(100, startValue.current + deltaY));
    onChange(newValue);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Convert value (-100 to 100) to rotation (-135 to 135 degrees)
  const rotation = (value / 100) * 135;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* L/R labels */}
      <div className="flex justify-between w-full px-1 text-[9px] font-mono text-muted-foreground">
        <span>L</span>
        <span>R</span>
      </div>

      {/* Knob container */}
      <div className="relative">
        {/* Outer ring with markings */}
        <div className="w-10 h-10 rounded-full bg-console-metal-dark p-0.5">
          {/* Knob */}
          <div
            ref={knobRef}
            className="w-full h-full rounded-full knob cursor-pointer select-none relative"
            onMouseDown={handleMouseDown}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* Indicator line */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0.5 h-2 knob-indicator rounded-full" />
          </div>
        </div>

        {/* Center dot when at center position */}
        {Math.abs(value) < 5 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-console-amber pointer-events-none" />
        )}
      </div>

      {/* Pan value display */}
      <div className="text-[9px] font-mono text-console-cream">
        {value === 0 ? "C" : value < 0 ? `L${Math.abs(value)}` : `R${value}`}
      </div>
    </div>
  );
};
