import * as Slider from "@radix-ui/react-slider";

interface FaderProps {
  value: number;
  onChange: (value: number) => void;
}

const Fader = ({ value, onChange }: FaderProps) => {
  return (
    <div className="relative flex items-center justify-center w-12 h-64 py-2">
      {/* Scale markings */}
      <div className="absolute left-2 h-[200px] flex flex-col justify-between text-[9px] font-mono text-console-beige/40 select-none pointer-events-none">
        <span>+10</span>
        <span>0</span>
        <span>-5</span>
        <span>-10</span>
        <span>-20</span>
        <span>-30</span>
        <span>-40</span>
        <span>-∞</span>
      </div>

      {/* Fader Track Slot */}
      <div className="absolute w-1.5 h-[200px] bg-black/60 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] border border-white/5" />

      <Slider.Root
        className="relative flex flex-col items-center w-full h-[200px] touch-none select-none"
        value={[value]}
        max={100}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        orientation="vertical"
      >
        <Slider.Track className="relative flex-grow w-full bg-transparent">
          <Slider.Range className="absolute w-full bg-transparent" />
        </Slider.Track>

        <Slider.Thumb
          className="block w-10 h-16 focus:outline-none cursor-grab active:cursor-grabbing relative z-10 group"
          aria-label="Volume"
        >
          {/* Realistic Fader Cap */}
          <div className="w-full h-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded shadow-[0_4px_8px_rgba(0,0,0,0.6),0_1px_2px_rgba(0,0,0,0.8)] border-t border-white/20 relative overflow-hidden transform group-active:scale-95 transition-transform">
             {/* Center groove */}
             <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/80 shadow-[0_0_5px_rgba(255,255,255,0.5)]" />

             {/* Grip textures */}
             <div className="absolute top-2 left-1 right-1 h-[1px] bg-black/50" />
             <div className="absolute top-3 left-1 right-1 h-[1px] bg-black/50" />
             <div className="absolute bottom-2 left-1 right-1 h-[1px] bg-black/50" />
             <div className="absolute bottom-3 left-1 right-1 h-[1px] bg-black/50" />

             {/* Side highlights */}
             <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-white/10" />
             <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-black/40" />
          </div>
        </Slider.Thumb>
      </Slider.Root>
    </div>
  );
};

export default Fader;