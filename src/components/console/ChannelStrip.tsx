import { Fader } from "./Fader";
import { PanKnob } from "./PanKnob";
import { MuteButton } from "./MuteButton";

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
  return (
    <div className="flex flex-col items-center gap-3 p-3 console-metal rounded border border-console-metal-light/20">
      {/* Screws at top */}
      <div className="flex justify-between w-full px-1">
        <div className="w-2 h-2 rounded-full screw" />
        <div className="w-2 h-2 rounded-full screw" />
      </div>

      {/* Channel number */}
      <div className="text-[10px] font-mono font-semibold text-console-amber">
        {channelNumber.toString().padStart(2, "0")}
      </div>

      {/* Pan knob */}
      <PanKnob value={panValue} onChange={onPanChange} />

      {/* Mute button */}
      <MuteButton isMuted={isMuted} onToggle={onMuteToggle} />

      {/* Fader */}
      <Fader value={faderValue} onChange={onFaderChange} />

      {/* Channel name input */}
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="w-full px-1 py-0.5 text-[10px] font-mono text-center bg-console-groove text-console-cream border border-console-metal-dark rounded-sm focus:outline-none focus:ring-1 focus:ring-console-amber channel-label"
        maxLength={8}
      />
    </div>
  );
};
