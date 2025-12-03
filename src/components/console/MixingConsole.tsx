import { useState } from "react";
import { ChannelStrip } from "./ChannelStrip";
import { MixSelector } from "./MixSelector";

interface ChannelState {
  name: string;
  faderValue: number;
  panValue: number;
  isMuted: boolean;
}

type MixState = ChannelState[];

const defaultChannelNames = [
  "Kick",
  "Snare",
  "HiHat",
  "Toms",
  "Bass",
  "Gtr L",
  "Gtr R",
  "Keys",
  "Vox",
  "BGV",
];

const createDefaultMix = (): MixState =>
  defaultChannelNames.map((name) => ({
    name,
    faderValue: 70,
    panValue: 0,
    isMuted: false,
  }));

export const MixingConsole = () => {
  const [selectedMix, setSelectedMix] = useState(0);
  const [mixes, setMixes] = useState<MixState[]>([
    createDefaultMix(),
    createDefaultMix(),
    createDefaultMix(),
    createDefaultMix(),
  ]);

  const currentMix = mixes[selectedMix];

  const updateChannel = (
    channelIndex: number,
    update: Partial<ChannelState>
  ) => {
    setMixes((prev) => {
      const newMixes = [...prev];
      newMixes[selectedMix] = newMixes[selectedMix].map((channel, i) =>
        i === channelIndex ? { ...channel, ...update } : channel
      );
      return newMixes;
    });
  };

  return (
    <div className="min-h-screen console-wood p-6 flex flex-col">
      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-2xl font-mono font-bold text-console-amber text-glow-amber tracking-wider">
          CUE MONITOR SYSTEM
        </h1>
        <p className="text-xs font-mono text-muted-foreground mt-1 tracking-widest uppercase">
          Personal Monitor Mixing Console
        </p>
      </header>

      {/* Console body */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {/* Mix Selector Panel */}
        <div className="flex-shrink-0">
          <MixSelector selectedMix={selectedMix} onSelectMix={setSelectedMix} />
        </div>

        {/* Channel strips */}
        <div className="flex gap-1">
          {currentMix.map((channel, index) => (
            <ChannelStrip
              key={index}
              channelNumber={index + 1}
              name={channel.name}
              faderValue={channel.faderValue}
              panValue={channel.panValue}
              isMuted={channel.isMuted}
              onFaderChange={(value) =>
                updateChannel(index, { faderValue: value })
              }
              onPanChange={(value) => updateChannel(index, { panValue: value })}
              onMuteToggle={() =>
                updateChannel(index, { isMuted: !channel.isMuted })
              }
              onNameChange={(name) => updateChannel(index, { name })}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center mt-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded console-metal border border-console-metal-light/20">
          <div className="w-2 h-2 rounded-full bg-console-amber animate-glow-pulse" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            System Active
          </span>
        </div>
      </footer>
    </div>
  );
};
