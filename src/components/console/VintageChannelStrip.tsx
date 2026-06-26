import * as Slider from "@radix-ui/react-slider";
import { useRef, useState, useEffect } from "react";
import { VUMeter } from "./VUMeter";

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444",
  B: "#22c55e",
  C: "#3b82f6",
  D: "#f97316",
};

interface VintageChannelStripProps {
  channelNumber: number;
  name: string;
  faderValue: number;
  panValue: number;
  isMuted: boolean;
  meterLevel: number;
  group?: string;
  onFaderChange: (value: number) => void;
  onFaderDragEnd?: () => void;
  isFaderSelected?: boolean;
  onFaderSelect?: () => void;
  onPanChange:  (value: number) => void;
  onMuteToggle: () => void;
  onNameChange: (name: string) => void;
  onGroupChange: () => void;
  groupBypassed?: boolean;
  onGroupBypass?: () => void;
  requireFaderSelect?: boolean;
  isStereo?: boolean;
}

/* ── same taper as Fader.tsx ─────────────────────────────── */
const scaleMarks = [
  { label: "+12", pos: 100 },
  { label: "+6",  pos: 89  },
  { label: "0",   pos: 78  },
  { label: "-6",  pos: 69  },
  { label: "-12", pos: 61  },
  { label: "-20", pos: 51  },
  { label: "-32", pos: 38  },
  { label: "-56", pos: 18  },
  { label: "-∞",  pos: 0   },
];

function uiToDb(ui: number): number {
  const x = ui / 100;
  if (x >= 0.89) return  6 + (x - 0.89) * (6  / 0.11);
  if (x >= 0.78) return  0 + (x - 0.78) * (6  / 0.11);
  if (x >= 0.69) return -6 + (x - 0.69) * (6  / 0.09);
  if (x >= 0.61) return -12 + (x - 0.61) * (6  / 0.08);
  if (x >= 0.51) return -20 + (x - 0.51) * (8  / 0.10);
  if (x >= 0.38) return -32 + (x - 0.38) * (12 / 0.13);
  if (x >= 0.18) return -56 + (x - 0.18) * (24 / 0.20);
  const t = x / 0.18;
  return -56 - Math.pow(1 - t, 2) * 88;
}

function dbToUi(db: number): number {
  if (db >= 6)   return 89  + ((db - 6)   / 6)  * 11;
  if (db >= 0)   return 78  + ((db - 0)   / 6)  * 11;
  if (db >= -6)  return 69  + ((db + 6)   / 6)  * 9;
  if (db >= -12) return 61  + ((db + 12)  / 6)  * 8;
  if (db >= -20) return 51  + ((db + 20)  / 8)  * 10;
  if (db >= -32) return 38  + ((db + 32)  / 12) * 13;
  if (db >= -56) return 18  + ((db + 56)  / 24) * 20;
  const t = (db + 56) / -88;
  return 18 * (1 - Math.sqrt(Math.max(0, t)));
}

/* ── Vintage Pan Knob ─────────────────────────────────────── */
const isTouchDevice =
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

function VintagePanKnob({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [isDragging, setIsDragging]  = useState(false);
  const prevY         = useRef(0);
  const lastTap       = useRef(0);
  const knobRef       = useRef<HTMLDivElement>(null);
  const touchStartX   = useRef(0);
  const touchStartVal = useRef(0);
  const valueRef      = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const rotation = ((value - 50) / 50) * 135;

  /* ── Desktop: vertical mouse drag ── */
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const delta = prevY.current - e.clientY;
      prevY.current = e.clientY;
      onChange(Math.min(100, Math.max(0, valueRef.current + delta * 0.8)));
    };
    const onEnd = () => { setIsDragging(false); document.body.style.cursor = ""; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
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
      e.preventDefault();
      const now = Date.now();
      if (now - lastTap.current < 300) { onChange(50); lastTap.current = 0; return; }
      lastTap.current = now;
      touchStartX.current   = e.touches[0].clientX;
      touchStartVal.current = valueRef.current;
      setIsDragging(true);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => el.removeEventListener("touchstart", onTouchStart);
  }, [onChange]);

  /* ── Mobile: horizontal touchmove ── */
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
    <div className="relative w-14 h-14 flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border-2 border-[#8b6914]/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" />
      <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[7px] font-bold text-[#c8960c]/70">L</span>
      <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[7px] font-bold text-[#c8960c]/70">R</span>
      <div
        ref={knobRef}
        className="w-10 h-10 rounded-full relative"
        style={{
          transform: `rotate(${rotation}deg)`,
          touchAction: "none",
          cursor: isTouchDevice ? "default" : "ew-resize",
          background: "radial-gradient(circle at 35% 30%, #c87028, #7a3e10 60%, #3a1a05)",
          boxShadow: "0 3px 6px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,200,80,0.25)",
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => !isTouchDevice && onChange(50)}
      >
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#ffe080] shadow-[0_0_4px_rgba(255,220,80,0.9)]" />
      </div>
    </div>
  );
}

/* ── Vintage Fader ────────────────────────────────────────── */
function VintageFader({ value, onChange, onDragEnd, isSelected, onSelect, requireSelect = true }: {
  value: number; onChange: (v: number) => void; onDragEnd?: () => void;
  isSelected?: boolean; onSelect?: () => void; requireSelect?: boolean;
}) {
  const numericValue = Number(value);
  const active = !requireSelect || isSelected;

  return (
    <div
      className="relative flex flex-col items-center justify-start w-14 h-64 py-2"
      style={{ touchAction: requireSelect ? 'pan-x' : 'none' }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (requireSelect && !isSelected) onSelect?.();
      }}
    >

      <div className="absolute inset-0 flex flex-col items-center justify-start py-2"
           style={{ pointerEvents: active ? 'auto' : 'none' }}>

        {/* scale marks */}
        <div className="absolute left-0 h-[200px] w-6 pointer-events-none select-none" style={{ top: 8 }}>
          {scaleMarks.map(({ label, pos }) => (
            <div
              key={label}
              className="absolute right-0 text-[8px] font-mono text-[#c8960c]/60 leading-none"
              style={{ bottom: `${pos}%` }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* track groove */}
        <div className="absolute w-2 h-[200px] rounded-sm shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] border border-[#8b6914]/30"
             style={{ background: "linear-gradient(to right, #0a0604, #1a100a, #0a0604)", top: 8 }} />

        {/* slider */}
        <Slider.Root
          className="relative flex flex-col items-center w-full h-[200px]"
          value={[dbToUi(numericValue)]}
          min={0} max={100} step={0.1}
          onValueChange={(vals) => onChange(uiToDb(vals[0]))}
          onValueCommit={() => onDragEnd?.()}
          orientation="vertical"
        >
          <Slider.Track className="relative flex-grow w-full bg-transparent" />
          <Slider.Thumb
            className="block w-12 h-8 relative z-10 cursor-grab active:cursor-grabbing"
            aria-label="Volume"
          >
            <div className="w-full h-full rounded-sm relative overflow-hidden"
                 style={{
                   background: "linear-gradient(to bottom, #e8dfc0, #c8b890 40%, #b09860)",
                   boxShadow: "0 3px 8px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.4)",
                   border: "1px solid #8b6914",
                 }}>
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#6b4910]/70" />
              <div className="absolute top-1.5 left-1.5 right-1.5 h-[1px] bg-[#6b4910]/40" />
              <div className="absolute bottom-1.5 left-1.5 right-1.5 h-[1px] bg-[#6b4910]/40" />
            </div>
          </Slider.Thumb>
        </Slider.Root>

      </div>{/* koniec inner pointer-events div */}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────── */
export const VintageChannelStrip = ({
  channelNumber,
  name,
  faderValue,
  panValue,
  isMuted,
  meterLevel,
  group,
  onFaderChange,
  onFaderDragEnd,
  isFaderSelected,
  onFaderSelect,
  onPanChange,
  onMuteToggle,
  onNameChange,
  onGroupChange,
  groupBypassed,
  onGroupBypass,
  requireFaderSelect = true,
  isStereo = false,
}: VintageChannelStripProps) => {
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const inputRef = useRef<HTMLInputElement>(null);

  const len = name.length;
  const nameFontSize = len <= 5 ? 9 : len <= 7 ? 8 : len <= 9 ? 7 : 6;
  const nameTracking = len <= 5 ? "0.05em" : "0";

  return (
    <div
      className="w-20 flex-shrink-0 flex flex-col border-r border-[#8b6914]/30 relative select-none"
      style={{
        background: "linear-gradient(to bottom, #1e1208, #2a1a0c, #1e1208)",
        ...(isFaderSelected ? { boxShadow: "inset 0 0 0 1px rgba(200,150,12,0.25), 0 0 8px rgba(200,130,10,0.1)" } : {}),
      }}
    >
      {/* top brass strip */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #6b4910, #c8960c, #6b4910)" }} />

      {/* channel number + group badge + bypass */}
      <div className="flex items-center justify-between px-1.5 py-1 border-b border-[#8b6914]/30"
           style={{ background: "#120c06" }}>
        <span className="text-[9px] font-mono font-bold tracking-widest text-[#c8960c]/70">
          {channelNumber.toString().padStart(2, "0")}
        </span>
        <div className="flex items-center gap-0.5">
          {group && (
            <button
              onClick={onGroupBypass}
              title={groupBypassed ? "Bypass aktywny – kliknij aby włączyć grupę" : "Kliknij aby bypass grupy"}
              className="h-3.5 px-0.5 rounded flex items-center justify-center text-[6px] font-bold transition-all active:scale-90"
              style={groupBypassed
                ? { border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.07)" }
                : { border: `1px solid ${GROUP_COLORS[group]}44`, color: `${GROUP_COLORS[group]}88`, background: "transparent" }
              }
            >
              {groupBypassed ? "BYP" : "GRP"}
            </button>
          )}
          <button
            onClick={onGroupChange}
            title={group ? `Grupa ${group}` : "Przypisz grupę"}
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold transition-all active:scale-90"
            style={
              group
                ? { background: groupBypassed ? "rgba(90,80,60,0.7)" : GROUP_COLORS[group], color: "white" }
                : { border: "1px solid rgba(200,150,12,0.2)", color: "rgba(200,150,12,0.3)" }
            }
          >
            {group ?? "·"}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 px-1 pt-2 flex-1">

        {/* scribble strip */}
        <div className="w-full">
          <div className="relative flex items-center justify-center h-6 rounded-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] border border-[#6b4910]/50"
               style={{ background: "#f0e6c8" }}>
            <input
              ref={inputRef}
              type="text"
              value={name}
              readOnly={isMobile}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-transparent text-center font-bold uppercase outline-none px-1"
              style={{ color: "#2a1a0c", fontFamily: "monospace", fontSize: nameFontSize, letterSpacing: nameTracking }}
              maxLength={10}
              spellCheck={false}
            />
          </div>
        </div>

        {/* pan section */}
        <div className="flex flex-col items-center gap-0.5 w-full py-1 border-y border-[#8b6914]/20"
             style={isStereo ? { opacity: 0.3, pointerEvents: 'none' } : undefined}>
          <span className="text-[7px] tracking-[0.2em] font-bold uppercase text-[#c8960c]/50">Pan</span>
          <VintagePanKnob value={panValue} onChange={onPanChange} />
        </div>

        {/* mute — vintage illuminated button */}
        <button
          onClick={onMuteToggle}
          className="relative w-12 h-7 rounded-sm overflow-hidden transition-all active:scale-95"
          style={{
            background: isMuted
              ? "linear-gradient(to bottom, #c01010, #800808)"
              : "linear-gradient(to bottom, #2a1a0c, #1a0e06)",
            border: isMuted ? "1px solid #ff4040" : "1px solid #6b4910",
            boxShadow: isMuted
              ? "0 0 8px rgba(200,20,20,0.6), inset 0 1px 2px rgba(255,80,80,0.3)"
              : "inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          {isMuted && <div className="absolute inset-0 bg-red-400/20 animate-pulse pointer-events-none" />}
          <span className="relative z-10 text-[9px] font-bold tracking-[0.15em]"
                style={{ color: isMuted ? "#ffc0c0" : "#c8960c" }}>
            MUTE
          </span>
        </button>

        {/* fader + VU meter */}
        <div className="flex-1 w-full flex justify-center items-start gap-1 pb-1">
          <VintageFader value={faderValue} onChange={onFaderChange} onDragEnd={onFaderDragEnd}
                        isSelected={isFaderSelected} onSelect={onFaderSelect}
                        requireSelect={requireFaderSelect} />
          <VUMeter
            level={meterLevel}
            color="#c8960c"
            bg="rgba(10,6,2,0.8)"
          />
        </div>

      </div>

      {/* bottom brass strip */}
      <div className="h-1 w-full" style={{ background: "linear-gradient(to right, #6b4910, #c8960c, #6b4910)" }} />
    </div>
  );
};

export default VintageChannelStrip;
