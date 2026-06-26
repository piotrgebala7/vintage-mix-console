import * as Slider from "@radix-ui/react-slider";

interface FaderProps {
  value: number; // dB
  onChange: (value: number) => void;
  onDragEnd?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  requireSelect?: boolean; // false = desktop, no tap-to-select needed
}

/* -----------------------------------------------------------
   REAL UAD SCALE (pixel-perfect from your screenshot)
----------------------------------------------------------- */
const scaleMarks = [
  { label: "+12", pos: 100 },
  { label: "+6", pos: 89 },
  { label: "0", pos: 78 },
  { label: "-6", pos: 69 },
  { label: "-12", pos: 61 },
  { label: "-20", pos: 51 },
  { label: "-32", pos: 38 },
  { label: "-56", pos: 18 },
  { label: "-∞", pos: 0 },
];

/* -----------------------------------------------------------
   UI → dB  (UAD taper + real log tail to -144)
----------------------------------------------------------- */
function uiToDb(ui: number): number {
  const x = ui / 100;

  // Top UAD ranges
  if (x >= 0.89) return 6 + (x - 0.89) * (6 / 0.11);
  if (x >= 0.78) return 0 + (x - 0.78) * (6 / 0.11);
  if (x >= 0.69) return -6 + (x - 0.69) * (6 / 0.09);
  if (x >= 0.61) return -12 + (x - 0.61) * (6 / 0.08);
  if (x >= 0.51) return -20 + (x - 0.51) * (8 / 0.10);
  if (x >= 0.38) return -32 + (x - 0.38) * (12 / 0.13);
  if (x >= 0.18) return -56 + (x - 0.18) * (24 / 0.20);

  // BELOW -56 → real log fade-out to -144 dB
  const t = x / 0.18; // 0–1
  return -56 - Math.pow(1 - t, 2) * 88; // (144 - 56) = 88
}

/* -----------------------------------------------------------
   dB → UI  (reverse taper)
----------------------------------------------------------- */
function dbToUi(db: number): number {
  if (db >= 6) return 89 + ((db - 6) / 6) * 11;
  if (db >= 0) return 78 + ((db - 0) / 6) * 11;
  if (db >= -6) return 69 + ((db + 6) / 6) * 9;
  if (db >= -12) return 61 + ((db + 12) / 6) * 8;
  if (db >= -20) return 51 + ((db + 20) / 8) * 10;
  if (db >= -32) return 38 + ((db + 32) / 12) * 13;
  if (db >= -56) return 18 + ((db + 56) / 24) * 20;

  // BELOW -56 → reverse of the curved log tail
  const t = (db + 56) / -88; // normalized (negative)
  return 18 * (1 - Math.sqrt(Math.max(0, t)));
}

/* -----------------------------------------------------------
   COMPONENT
----------------------------------------------------------- */

const Fader = ({ value, onChange, onDragEnd, isSelected, onSelect, requireSelect = true }: FaderProps) => {
  const numericValue = Number(value);
  const active = !requireSelect || isSelected;

  return (
    <div
      className="relative flex flex-col items-center justify-start w-12 h-64 py-2"
      style={{ touchAction: requireSelect ? 'pan-x' : 'none' }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (requireSelect && !isSelected) onSelect?.();
      }}
    >

      <div className="absolute inset-0 flex flex-col items-center justify-start py-2"
           style={{ pointerEvents: active ? 'auto' : 'none' }}>

      {/* SCALE */}
      <div className="absolute top-2 left-0 h-[200px] w-5 pointer-events-none select-none">
        {scaleMarks.map(({ label, pos }) => (
          <div
            key={label}
            className="absolute right-0 flex items-center gap-[2px]"
            style={{ bottom: `${pos}%`, transform: "translateY(50%)" }}
          >
            <span className="text-[8px] font-mono text-console-beige/40 text-right w-full leading-none">
              {label}
            </span>
            <div className="w-[3px] h-px bg-console-beige/20 flex-shrink-0" />
          </div>
        ))}
      </div>

      {/* TRACK */}
      <div className="absolute w-1.5 h-[200px] bg-black/60 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] border border-white/5" />

      {/* SLIDER */}
      <Slider.Root
        className="relative flex flex-col items-center w-full h-[200px]"
        style={{ touchAction: 'pan-x' }}
        value={[dbToUi(numericValue)]}
        min={0}
        max={100}
        step={0.1}
        onValueChange={(vals) => onChange(uiToDb(vals[0]))}
        onValueCommit={() => onDragEnd?.()}
        orientation="vertical"
      >
        <Slider.Track className="relative flex-grow w-full bg-transparent" />

        {/* THUMB WITH YOUR ORIGINAL TEXTURE */}
        <Slider.Thumb
          className="block w-10 h-16 relative z-10 cursor-grab active:cursor-grabbing group"
          style={{ touchAction: 'pan-x' }}
          aria-label="Volume"
        >
          <div className="w-full h-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded shadow-[0_4px_8px_rgba(0,0,0,0.6),0_1px_2px_rgba(0,0,0,0.8)] border-t border-white/20 relative overflow-hidden transform group-active:scale-95 transition-transform">
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/80" />
            <div className="absolute top-2 left-1 right-1 h-[1px] bg-black/50" />
            <div className="absolute top-3 left-1 right-1 h-[1px] bg-black/50" />
            <div className="absolute bottom-2 left-1 right-1 h-[1px] bg-black/50" />
            <div className="absolute bottom-3 left-1 right-1 h-[1px] bg-black/50" />
            <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-white/10" />
            <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-black/40" />
          </div>
        </Slider.Thumb>
      </Slider.Root>

      </div>{/* koniec inner pointer-events div */}
    </div>
  );
};

export default Fader;
