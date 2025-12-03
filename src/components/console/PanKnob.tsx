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
    <div className="flex flex-col items-center gap-1.5">
      {/* L/R labels - embossed style */}
      <div className="flex justify-between w-full px-0.5 text-[9px] font-display tracking-wider embossed-text">
        <span className="font-bold">L</span>
        <span className="text-[7px] opacity-70">PAN</span>
        <span className="font-bold">R</span>
      </div>

      {/* Knob container with chrome ring */}
      <div className="relative">
        {/* Outer chrome/brass ring */}
        <div 
          className="w-12 h-12 rounded-full p-[3px] knob-chrome-ring"
          style={{
            background: 'linear-gradient(145deg, hsl(42 55% 58%) 0%, hsl(40 50% 42%) 50%, hsl(42 50% 52%) 100%)',
          }}
        >
          {/* Bakelite housing */}
          <div 
            className="w-full h-full rounded-full bg-console-bakelite p-1"
            style={{
              boxShadow: 'inset 0 3px 6px hsl(0 0% 0% / 0.7), inset 0 -1px 2px hsl(40 15% 35% / 0.3)'
            }}
          >
            {/* Scale markings */}
            <div className="absolute inset-0 rounded-full">
              {[-135, -90, -45, 0, 45, 90, 135].map((angle, i) => (
                <div
                  key={i}
                  className={`absolute rounded-full ${angle === 0 ? 'w-1 h-1.5 bg-console-amber' : 'w-0.5 h-1 bg-console-beige/50'}`}
                  style={{
                    top: '50%',
                    left: '50%',
                    transformOrigin: '50% 50%',
                    transform: `rotate(${angle}deg) translateY(-20px) translateX(-50%)`,
                    boxShadow: angle === 0 ? '0 0 4px hsl(35 95% 55% / 0.5)' : 'none',
                  }}
                />
              ))}
            </div>

            {/* The actual knob */}
            <div
              ref={knobRef}
              className="w-full h-full rounded-full knob cursor-pointer select-none relative transition-transform"
              onMouseDown={handleMouseDown}
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transitionDuration: isDragging ? '0ms' : '50ms',
              }}
            >
              {/* Indicator line */}
              <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-[3px] h-3 knob-indicator rounded-full" />
              
              {/* Knob grip texture - radial lines */}
              <div className="absolute inset-2 rounded-full border border-console-metal-light/15" />
              <div className="absolute inset-3 rounded-full border border-console-metal-dark/20" />
            </div>
          </div>
        </div>

        {/* Center LED when at center position */}
        {Math.abs(value) < 5 && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-console-amber led-indicator pointer-events-none animate-pulse"
            style={{ animationDuration: '1.5s' }}
          />
        )}
      </div>

      {/* Pan value display - LCD style */}
      <div className="px-2.5 py-1 recessed-display rounded-sm border border-console-bakelite">
        <span 
          className="text-[10px] lcd-display text-console-amber font-medium tracking-wider"
          style={{ textShadow: '0 0 8px hsl(35 95% 55% / 0.7)' }}
        >
          {value === 0 ? "CTR" : value < 0 ? `L${Math.abs(value).toString().padStart(2, '0')}` : `R${value.toString().padStart(2, '0')}`}
        </span>
      </div>
    </div>
  );
};