import { useState, useRef } from "react";

interface FaderProps {
  value: number;
  onChange: (value: number) => void;
}

export const Fader = ({ value, onChange }: FaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateValue(e);
    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const percentage = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
      onChange(percentage);
    }
  };

  const handleGlobalMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleGlobalMouseMove);
    document.removeEventListener("mouseup", handleGlobalMouseUp);
  };

  const updateValue = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
    onChange(percentage);
  };

  // SSL-style dB markings
  const marks = [
    { pos: 100, label: "+10", major: true },
    { pos: 92, label: "+5", major: false },
    { pos: 85, label: "", major: false },
    { pos: 77, label: "0", major: true },
    { pos: 70, label: "", major: false },
    { pos: 62, label: "-5", major: false },
    { pos: 55, label: "", major: false },
    { pos: 47, label: "-10", major: true },
    { pos: 40, label: "", major: false },
    { pos: 32, label: "-20", major: false },
    { pos: 22, label: "-30", major: false },
    { pos: 12, label: "-40", major: false },
    { pos: 3, label: "-∞", major: true },
  ];

  return (
    <div className="relative flex items-center gap-1.5 h-56">
      {/* Scale markings - left side */}
      <div className="relative h-full w-8">
        {marks.map((mark, i) => (
          <div
            key={i}
            className="absolute right-0 flex items-center gap-0.5"
            style={{
              top: `${100 - mark.pos}%`,
              transform: 'translateY(-50%)',
            }}
          >
            {mark.label && (
              <span className={`text-[7px] font-mono text-console-cream/80 w-5 text-right ${mark.major ? 'font-bold text-console-cream' : ''}`}>
                {mark.label}
              </span>
            )}
            <div 
              className={`h-px ${mark.major ? 'w-3 bg-console-cream/60' : 'w-2 bg-console-cream/30'}`}
            />
          </div>
        ))}
      </div>

      {/* SSL-style fader track */}
      <div
        ref={trackRef}
        className="relative w-7 h-full cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        {/* Outer frame - black bezel */}
        <div 
          className="absolute inset-0 rounded-[2px]"
          style={{
            background: 'linear-gradient(180deg, hsl(0 0% 5%) 0%, hsl(0 0% 12%) 50%, hsl(0 0% 5%) 100%)',
            boxShadow: 'inset 0 2px 4px hsl(0 0% 0%), 0 1px 0 hsl(0 0% 20% / 0.3)',
          }}
        />

        {/* Inner track groove */}
        <div 
          className="absolute inset-x-[6px] inset-y-1 rounded-[1px]"
          style={{
            background: 'linear-gradient(90deg, hsl(0 0% 3%) 0%, hsl(0 0% 8%) 50%, hsl(0 0% 3%) 100%)',
            boxShadow: 'inset 0 2px 6px hsl(0 0% 0%), inset 2px 0 4px hsl(0 0% 0% / 0.5), inset -2px 0 4px hsl(0 0% 0% / 0.5)',
          }}
        />

        {/* Center rail - polished metal */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-[3px] inset-y-3 rounded-full"
          style={{
            background: 'linear-gradient(90deg, hsl(0 0% 25%) 0%, hsl(0 0% 50%) 40%, hsl(0 0% 60%) 50%, hsl(0 0% 50%) 60%, hsl(0 0% 25%) 100%)',
          }}
        />

        {/* Minor tick marks on track */}
        {[92, 85, 70, 62, 55, 40, 32, 22, 12].map((pos) => (
          <div
            key={pos}
            className="absolute left-2 right-2 h-px bg-console-cream/15"
            style={{ top: `${100 - pos}%` }}
          />
        ))}

        {/* SSL-style fader cap */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-10 h-10 cursor-grab active:cursor-grabbing"
          style={{ 
            bottom: `calc(${value}% - 20px)`,
            transition: isDragging ? 'none' : 'bottom 0.05s ease-out'
          }}
        >
          {/* Main fader body */}
          <div 
            className="absolute inset-0 rounded-[3px]"
            style={{
              background: 'linear-gradient(180deg, hsl(0 0% 70%) 0%, hsl(0 0% 55%) 15%, hsl(0 0% 45%) 50%, hsl(0 0% 35%) 85%, hsl(0 0% 25%) 100%)',
              boxShadow: '0 2px 4px hsl(0 0% 0% / 0.5), 0 4px 8px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(0 0% 80% / 0.5)',
            }}
          />

          {/* Top bevel */}
          <div 
            className="absolute inset-x-0 top-0 h-[3px] rounded-t-[3px]"
            style={{
              background: 'linear-gradient(180deg, hsl(0 0% 75%) 0%, hsl(0 0% 60%) 100%)',
            }}
          />

          {/* Grip ridges - SSL style */}
          <div className="absolute inset-x-[3px] top-[6px] bottom-[6px] flex flex-col justify-evenly">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="h-[1px] rounded-full"
                style={{
                  background: i % 2 === 0 
                    ? 'linear-gradient(90deg, transparent 5%, hsl(0 0% 30%) 20%, hsl(0 0% 30%) 80%, transparent 95%)'
                    : 'linear-gradient(90deg, transparent 5%, hsl(0 0% 60%) 20%, hsl(0 0% 60%) 80%, transparent 95%)',
                }}
              />
            ))}
          </div>

          {/* Center indicator - red SSL line */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-[4px] rounded-[1px]"
            style={{
              background: 'linear-gradient(180deg, hsl(0 85% 55%) 0%, hsl(0 80% 45%) 100%)',
              boxShadow: '0 1px 2px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(0 85% 70% / 0.4)',
            }}
          />

          {/* Bottom bevel */}
          <div 
            className="absolute inset-x-0 bottom-0 h-[3px] rounded-b-[3px]"
            style={{
              background: 'linear-gradient(180deg, hsl(0 0% 40%) 0%, hsl(0 0% 25%) 100%)',
            }}
          />

          {/* Side bevels for 3D effect */}
          <div 
            className="absolute top-[3px] bottom-[3px] left-0 w-[2px]"
            style={{
              background: 'linear-gradient(90deg, hsl(0 0% 65%) 0%, hsl(0 0% 50%) 100%)',
            }}
          />
          <div 
            className="absolute top-[3px] bottom-[3px] right-0 w-[2px]"
            style={{
              background: 'linear-gradient(90deg, hsl(0 0% 35%) 0%, hsl(0 0% 25%) 100%)',
            }}
          />
        </div>
      </div>

      {/* Scale markings - right side */}
      <div className="relative h-full w-6">
        {marks.filter(m => m.major).map((mark, i) => (
          <div
            key={i}
            className="absolute left-0 flex items-center gap-0.5"
            style={{
              top: `${100 - mark.pos}%`,
              transform: 'translateY(-50%)',
            }}
          >
            <div className="w-2 h-px bg-console-cream/40" />
          </div>
        ))}
      </div>
    </div>
  );
};
