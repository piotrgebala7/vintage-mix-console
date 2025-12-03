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

  // Scale markings with vintage dB labels
  const marks = [
    { pos: 100, label: "+10" },
    { pos: 85, label: "+5" },
    { pos: 70, label: "0" },
    { pos: 55, label: "-5" },
    { pos: 40, label: "-10" },
    { pos: 25, label: "-20" },
    { pos: 10, label: "-40" },
    { pos: 0, label: "-∞" },
  ];

  return (
    <div className="relative flex items-center gap-2 h-48">
      {/* Scale markings - left side */}
      <div className="flex flex-col justify-between h-full py-1 relative">
        {marks.map((mark) => (
          <div
            key={mark.pos}
            className="flex items-center gap-1"
            style={{
              position: 'absolute',
              top: `${100 - mark.pos}%`,
              transform: 'translateY(-50%)',
              right: 0,
            }}
          >
            <span className="text-[8px] font-mono embossed-text w-6 text-right">
              {mark.label}
            </span>
            <div className="w-2 h-px bg-console-brass/50" />
          </div>
        ))}
      </div>

      {/* Fader track */}
      <div
        className="relative w-8 h-full fader-groove rounded-sm cursor-pointer"
        style={{
          border: '2px solid hsl(30 12% 12%)',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Track markings - internal ridges */}
        <div className="absolute inset-y-3 left-1 w-px bg-console-brass/20" />
        <div className="absolute inset-y-3 right-1 w-px bg-console-brass/20" />
        
        {/* Unity gain mark (0dB) */}
        <div 
          className="absolute left-0 right-0 h-0.5 bg-console-amber/60"
          style={{ bottom: '70%' }}
        />

        {/* Value indicator line */}
        <div
          className="absolute left-1 right-1 h-px bg-console-amber/40"
          style={{ bottom: `${value}%` }}
        />

        {/* Fader handle */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-10 h-7 fader-handle rounded-sm cursor-grab active:cursor-grabbing"
          style={{ bottom: `calc(${value}% - 14px)` }}
        >
          {/* Handle grooves - vintage ribbed texture */}
          <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 flex flex-col gap-[2px]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex">
                <div className="flex-1 h-px bg-console-metal-dark/60" />
                <div className="flex-1 h-px bg-console-metal-light/40" />
              </div>
            ))}
          </div>
          
          {/* Center indicator line */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-console-cream/80 rounded-full" />
        </div>
      </div>
    </div>
  );
};
