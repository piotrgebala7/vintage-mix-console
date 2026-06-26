import { useRef } from "react";
import Fader from "./Fader";
import PanKnob from "./PanKnob";
import MuteButton from "./MuteButton";
import { VUMeter } from "./VUMeter";

const GROUP_COLORS: Record<string, string> = {
  A: "#ef4444",
  B: "#22c55e",
  C: "#3b82f6",
  D: "#f97316",
};

interface ChannelStripProps {
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

export const ChannelStrip = ({
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
}: ChannelStripProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const len          = name.length;
  const nameFontSize = len <= 5 ? 12 : len <= 7 ? 10 : len <= 9 ? 8 : 7;
  const nameTracking = len <= 5 ? "0.05em" : "0";

  return (
    <div className="w-24 md:w-28 flex-shrink-0 flex flex-col console-channel border-r border-black/20 relative group"
         style={isFaderSelected ? { boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 8px rgba(255,255,255,0.06)" } : undefined}>
      {/* Top Screw */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full screw" />

      <div className="pt-5 pb-1 px-1 flex flex-col items-center gap-2 flex-1">

        {/* CH number + group badge + bypass */}
        <div className="flex items-center justify-between w-full px-1">
          <span className="text-[10px] font-mono text-console-beige/50 font-bold">
            CH {channelNumber.toString().padStart(2, "0")}
          </span>
          <div className="flex items-center gap-0.5">
            {group && (
              <button
                onClick={onGroupBypass}
                title={groupBypassed ? "Bypass aktywny – kliknij aby włączyć grupę" : "Kliknij aby bypass grupy"}
                className="w-4 h-4 rounded flex items-center justify-center text-[6px] font-bold tracking-tight transition-all active:scale-90"
                style={groupBypassed
                  ? { border: "1px solid rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.08)" }
                  : { border: `1px solid ${GROUP_COLORS[group]}55`, color: `${GROUP_COLORS[group]}99`, background: "transparent" }
                }
              >
                {groupBypassed ? "BYP" : "GRP"}
              </button>
            )}
            <button
              onClick={onGroupChange}
              title={group ? `Grupa ${group} – kliknij aby zmienić` : "Kliknij aby przypisać grupę"}
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold transition-all active:scale-90"
              style={
                group
                  ? { background: groupBypassed ? "rgba(100,100,100,0.6)" : GROUP_COLORS[group], color: "white" }
                  : { border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.25)" }
              }
            >
              {group ?? "·"}
            </button>
          </div>
        </div>

        {/* Pan Knob */}
        <div className="flex flex-col items-center gap-1 pt-1"
             style={isStereo ? { opacity: 0.3, pointerEvents: 'none' } : undefined}>
          <span className="text-[8px] uppercase tracking-widest text-console-beige/70 font-semibold">Pan</span>
          <PanKnob value={panValue} onChange={onPanChange} />
        </div>

        {/* Mute Button */}
        <div className="py-1">
          <MuteButton isMuted={isMuted} onToggle={onMuteToggle} />
        </div>

        {/* Scribble Strip */}
        <div className="w-full px-3 pt-2">
          <div className="relative h-7 flex items-center justify-center bg-[#e0e0e0] rounded-[2px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] border border-gray-400/50">
            <input
              ref={inputRef}
              type="text"
              value={name}
              readOnly={isMobile}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-transparent text-center font-sans text-gray-900 font-bold uppercase outline-none px-1"
              style={{ fontSize: nameFontSize, letterSpacing: nameTracking }}
              maxLength={10}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Fader + VU Meter */}
        <div className="flex-1 w-full flex justify-center items-start gap-1 pb-1">
          <Fader value={faderValue} onChange={onFaderChange} onDragEnd={onFaderDragEnd}
                 isSelected={isFaderSelected} onSelect={onFaderSelect}
                 requireSelect={requireFaderSelect} />
          <VUMeter level={meterLevel} />
        </div>

      </div>

      {/* Bottom Screw */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full screw" />
    </div>
  );
};

export default ChannelStrip;
