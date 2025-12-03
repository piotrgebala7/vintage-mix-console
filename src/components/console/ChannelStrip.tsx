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
    <div className="flex flex-col items-center gap-3 p-3 console-channel rounded-sm vintage-border relative">
      {/* Screws at corners */}
      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full screw" />

      {/* Channel number - embossed style */}
      <div className="text-sm font-display tracking-widest embossed-text mt-2">
        CH {channelNumber.toString().padStart(2, "0")}
      </div>

      {/* Pan knob */}
      <PanKnob value={panValue} onChange={onPanChange} />

      {/* Mute button */}
      <MuteButton isMuted={isMuted} onToggle={onMuteToggle} />

      {/* Fader */}
      <Fader value={faderValue} onChange={onFaderChange} />

      {/* Channel name - vintage label tape style */}
      <div className="w-full px-1">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-2 py-1 text-[10px] font-mono text-center bg-console-groove text-console-amber border-2 border-console-bakelite rounded-none focus:outline-none focus:border-console-amber channel-label tracking-wider"
          style={{
            textShadow: '0 0 8px hsl(38 85% 52% / 0.5)',
          }}
          maxLength={8}
        />
      </div>
    </div>
  );
};
