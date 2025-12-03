import { Fader } from "./Fader";
import { PanKnob } from "./PanKnob";
import { MuteButton } from "./MuteButton";
import { VUMeter } from "./VUMeter";

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
  // Simulate VU level based on fader (with some variance for realism)
  const vuLevel = isMuted ? 0 : Math.min(100, faderValue * 0.95 + Math.random() * 5);

  return (
    <div className="flex flex-col items-center gap-3 p-3 console-channel rounded-sm vintage-border relative">
      {/* Screws at corners */}
      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full screw" />

      {/* Channel number - embossed nameplate style */}
      <div className="px-3 py-1 bg-console-metal-dark/30 rounded-sm border border-console-bakelite/50 mt-2">
        <span className="text-sm font-display tracking-[0.2em] embossed-text">
          CH {channelNumber.toString().padStart(2, "0")}
        </span>
      </div>

      {/* VU Meter */}
      <VUMeter level={vuLevel} />

      {/* Pan knob */}
      <PanKnob value={panValue} onChange={onPanChange} />

      {/* Mute button */}
      <MuteButton isMuted={isMuted} onToggle={onMuteToggle} />

      {/* Fader */}
      <Fader value={faderValue} onChange={onFaderChange} />

      {/* Channel name - vintage tape label style */}
      <div className="w-full px-1">
        <div className="relative">
          {/* Tape label background */}
          <div 
            className="absolute inset-0 bg-gradient-to-b from-amber-100/90 to-amber-50/80 rounded-[2px]"
            style={{
              boxShadow: '0 1px 2px hsl(0 0% 0% / 0.3), inset 0 1px 0 hsl(0 0% 100% / 0.5)'
            }}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="relative w-full px-2 py-1.5 text-[10px] font-mono text-center bg-transparent text-console-groove font-semibold border-none focus:outline-none focus:ring-1 focus:ring-console-amber channel-label tracking-wider"
            style={{
              textShadow: '0 1px 0 hsl(45 30% 95%)',
            }}
            maxLength={8}
          />
        </div>
      </div>
    </div>
  );
};