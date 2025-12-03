import { useState } from "react";

interface FaderProps {
  value: number;
  onChange: (value: number) => void;
}

export const Fader = ({ value, onChange }: FaderProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateValue(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateValue = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
    onChange(percentage);
  };

  // Scale markings
  const marks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className="relative flex items-center gap-2 h-48">
      {/* Scale markings - left side */}
      <div className="flex flex-col justify-between h-full py-1 text-[8px] font-mono text-muted-foreground">
        {marks.reverse().map((mark) => (
          <span key={mark} className="leading-none">
            {mark === 100 ? "+10" : mark === 70 ? "0" : mark === 0 ? "-∞" : ""}
          </span>
        ))}
      </div>

      {/* Fader track */}
      <div
        className="relative w-8 h-full fader-groove rounded cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Track markings */}
        <div className="absolute inset-y-2 left-1 w-px bg-muted-foreground/30" />
        <div className="absolute inset-y-2 right-1 w-px bg-muted-foreground/30" />
        
        {/* Value indicator line */}
        <div 
          className="absolute left-1 right-1 h-px bg-console-amber/50"
          style={{ bottom: `${value}%` }}
        />

        {/* Fader handle */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-10 h-6 fader-handle rounded-sm cursor-grab active:cursor-grabbing transition-transform"
          style={{ bottom: `calc(${value}% - 12px)` }}
        >
          {/* Handle grooves */}
          <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
            <div className="h-px bg-console-metal-dark" />
            <div className="h-px bg-console-metal-light" />
            <div className="h-px bg-console-metal-dark" />
            <div className="h-px bg-console-metal-light" />
            <div className="h-px bg-console-metal-dark" />
          </div>
        </div>
      </div>
    </div>
  );
};
