import { useRef } from "react";
import Fader from "./Fader";
import PanKnob from "./PanKnob";
import MuteButton from "./MuteButton";

interface ChannelStripProps {
  channelNumber: number;
  name: string;
  faderValue: number;
  panValue: number;
  isMuted: boolean;
  onFaderChange: (value: number) => void;
  onPanChange: (value: number) => void;
  onMuteToggle: () => void;
  onNameChange: (name: string) => void;
}

export const ChannelStrip = ({
  channelNumber,
  name,
  faderValue,
  panValue,
  isMuted,
  onFaderChange,
  onPanChange,
  onMuteToggle,
  onNameChange,
}: ChannelStripProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Simple mobile detection
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className="w-24 md:w-28 flex-shrink-0 flex flex-col console-channel border-r border-black/20 relative group">
      {/* Top Screw */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full screw" />

      <div className="pt-5 pb-1 px-1 flex flex-col items-center gap-2 flex-1">
        {/* Channel Number */}
        <span className="text-[10px] font-mono text-console-beige/50 font-bold">
          CH {channelNumber.toString().padStart(2, '0')}
        </span>

        {/* Pan Knob */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="text-[8px] uppercase tracking-widest text-console-beige/70 font-semibold">Pan</span>
          <PanKnob value={panValue} onChange={onPanChange} />
        </div>

        {/* Mute Button */}
        <div className="py-1">
          <MuteButton isMuted={isMuted} onToggle={onMuteToggle} />
        </div>

        {/* Scribble Strip - Clean & Simple */}
        <div className="w-full px-3 pt-2">
          <div className="relative h-7 flex items-center justify-center bg-[#e0e0e0] rounded-[2px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] border border-gray-400/50">
            <input
              ref={inputRef}
              type="text"
              value={name}
              readOnly={isMobile}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full bg-transparent text-center font-sans text-gray-900 text-xs font-bold uppercase tracking-wide outline-none px-1"
              maxLength={10}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Fader */}
        <div className="flex-1 w-full flex justify-center pb-1">
          <Fader value={faderValue} onChange={onFaderChange} />
        </div>

      </div>

      {/* Bottom Screw */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full screw" />
    </div>
  );
};

export default ChannelStrip;