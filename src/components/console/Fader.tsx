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
            <span className="text-[8px] font-mono embossed-text w-6 text-right font-medium">
              {mark.label}
            </span>
            <div 
              className="w-2.5 h-px brass-trim rounded-full"
              style={{ boxShadow: '0 1px 0 hsl(40 8% 50% / 0.3)' }}
            />
          </div>
        ))}
      </div>

      {/* Fader track */}
      <div
        className="relative w-9 h-full fader-groove rounded-sm cursor-pointer"
        style={{
          border: '3px solid hsl(25 18% 10%)',
          borderRadius: '3px',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Track side rails - chrome effect */}
        <div className="absolute inset-y-2 left-0.5 w-[2px] bg-gradient-to-b from-console-chrome/30 via-console-chrome/20 to-console-chrome/30 rounded-full" />
        <div className="absolute inset-y-2 right-0.5 w-[2px] bg-gradient-to-b from-console-chrome/30 via-console-chrome/20 to-console-chrome/30 rounded-full" />
        
        {/* Unity gain mark (0dB) - prominent */}
        <div 
          className="absolute left-0 right-0 h-[3px] bg-console-amber/70"
          style={{ 
            bottom: '70%',
            boxShadow: '0 0 6px hsl(35 95% 55% / 0.4)'
          }}
        />

        {/* Additional tick marks */}
        {[85, 55, 40, 25, 10].map((pos) => (
          <div
            key={pos}
            className="absolute left-0 right-0 h-px bg-console-brass/30"
            style={{ bottom: `${pos}%` }}
          />
        ))}

        {/* Fader handle */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-11 h-8 fader-handle rounded-[3px] cursor-grab active:cursor-grabbing"
          style={{ 
            bottom: `calc(${value}% - 16px)`,
            transition: isDragging ? 'none' : 'bottom 0.05s ease-out'
          }}
        >
          {/* Chrome cap top */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-b from-console-chrome to-console-chrome-dark rounded-t-[3px]" />
          
          {/* Handle grooves - vintage ribbed texture */}
          <div className="absolute inset-x-1.5 top-1.5 bottom-1.5 flex flex-col justify-center gap-[2px]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex">
                <div className="flex-1 h-px bg-console-metal-dark/70" />
                <div className="flex-1 h-px bg-console-metal-highlight/30" />
              </div>
            ))}
          </div>
          
          {/* Center indicator line - bright */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-[3px] bg-gradient-to-b from-console-cream to-console-beige rounded-full"
            style={{ boxShadow: '0 1px 2px hsl(0 0% 0% / 0.4)' }}
          />

          {/* Chrome cap bottom */}
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-t from-console-chrome-dark to-console-metal rounded-b-[3px]" />
        </div>
      </div>
    </div>
  );
};