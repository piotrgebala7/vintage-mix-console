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
      {/* L/R labels - embossed style */}
      <div className="flex justify-between w-full px-1 text-[9px] font-display tracking-wider embossed-text">
        <span>L</span>
        <span className="text-[7px]">PAN</span>
        <span>R</span>
      </div>

      {/* Knob container */}
      <div className="relative">
        {/* Outer ring - bakelite style */}
        <div className="w-11 h-11 rounded-full bg-console-bakelite p-1 shadow-inner"
          style={{
            boxShadow: 'inset 0 2px 4px hsl(0 0% 0% / 0.6), 0 1px 0 hsl(40 10% 35%)'
          }}
        >
          {/* Scale markings */}
          <div className="absolute inset-0 rounded-full">
            {[-135, -90, -45, 0, 45, 90, 135].map((angle, i) => (
              <div
                key={i}
                className="absolute w-0.5 h-1 bg-console-beige/40 rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  transformOrigin: '50% 50%',
                  transform: `rotate(${angle}deg) translateY(-18px) translateX(-50%)`,
                }}
              />
            ))}
          </div>

          {/* Knob */}
          <div
            ref={knobRef}
            className="w-full h-full rounded-full knob cursor-pointer select-none relative"
            onMouseDown={handleMouseDown}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {/* Indicator line */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0.5 h-2.5 knob-indicator rounded-full" />
            
            {/* Knob grip texture */}
            <div className="absolute inset-1 rounded-full border border-console-metal-light/20" />
          </div>
        </div>

        {/* Center dot when at center position */}
        {Math.abs(value) < 5 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-console-amber led-indicator pointer-events-none" />
        )}
      </div>

      {/* Pan value display - LCD style */}
      <div className="px-2 py-0.5 bg-console-groove rounded-sm border border-console-bakelite">
        <span className="text-[9px] font-mono text-console-amber" style={{ textShadow: '0 0 6px hsl(38 85% 52% / 0.6)' }}>
          {value === 0 ? "CTR" : value < 0 ? `L${Math.abs(value).toString().padStart(2, '0')}` : `R${value.toString().padStart(2, '0')}`}
        </span>
      </div>
    </div>
  );
};
