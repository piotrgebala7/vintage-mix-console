import { useState, useEffect } from "react";
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
  "KICK",
  "SNARE",
  "HIHAT",
  "TOMS",
  "BASS",
  "GTR L",
  "GTR R",
  "KEYS",
  "VOX",
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
  const [, forceUpdate] = useState(0);

  // Force re-render for VU meter animation
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

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
    <div className="min-h-screen console-wood p-6 md:p-8 flex flex-col">
      {/* Header - Vintage nameplate style */}
      <header className="text-center mb-6">
        <div className="inline-block console-panel px-8 py-4 vintage-border relative">
          {/* Corner accents */}
          <div className="absolute top-2 left-2 w-2 h-2 rounded-full screw" />
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full screw" />
          
          <h1 className="text-3xl md:text-4xl font-display text-console-amber text-glow-amber tracking-[0.3em]">
            CUE MONITOR SYSTEM
          </h1>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="h-[2px] flex-1 brass-trim rounded-full" />
            <p className="text-[10px] font-mono text-console-beige tracking-[0.2em] uppercase px-2">
              Personal Monitor Console • Series 400
            </p>
            <div className="h-[2px] flex-1 brass-trim rounded-full" />
          </div>
        </div>
      </header>

      {/* Console body */}
      <div className="flex-1 flex flex-col">
        <div 
          className="flex gap-4 md:gap-6 pb-2 overflow-x-auto scrollbar-vintage"
          style={{ scrollbarWidth: 'thin' }}
        >
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
      </div>

      {/* Footer - Vintage badge style */}
      <footer className="text-center mt-4">
        <div className="inline-flex items-center gap-4 px-6 py-3 console-panel vintage-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-console-green led-indicator animate-pulse" style={{ animationDuration: '2s' }} />
            <span className="text-[11px] font-display text-console-beige tracking-[0.15em] uppercase">
              Power
            </span>
          </div>
          <div className="w-px h-5 brass-trim" />
          <span className="text-[10px] font-mono text-console-beige/70 tracking-wider">
            48V PHANTOM • ACTIVE
          </span>
          <div className="w-px h-5 brass-trim" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-console-amber led-indicator animate-pulse" style={{ animationDuration: '3s' }} />
            <span className="text-[10px] font-mono text-console-beige/70 tracking-wider">
              SIGNAL
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
