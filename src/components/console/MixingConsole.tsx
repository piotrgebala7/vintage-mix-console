import { useState, useEffect, useRef } from "react";
import { ChannelStrip } from "./ChannelStrip";
import { MixSelector } from "./MixSelector";
import { io, Socket } from "socket.io-client";
import * as Slider from "@radix-ui/react-slider";
import { Settings, Save, FolderOpen, Trash2, Plus, Eye, EyeOff } from "lucide-react";

interface ChannelState {
  name: string;
  faderValue: number;
  panValue: number;
  isMuted: boolean;
  isHidden?: boolean;
}

type MixState = ChannelState[];

export const MixingConsole = () => {
  const [selectedMix, setSelectedMix] = useState(0);
  const [mixes, setMixes] = useState<MixState[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Preset & Config UI State
  const [showMenu, setShowMenu] = useState(false);
  const [presetList, setPresetList] = useState<string[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [newChannelCount, setNewChannelCount] = useState(8);

  // Visibility Mode State
  const [isVisibilityMode, setIsVisibilityMode] = useState(false);

  useEffect(() => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const newSocket = io(`${protocol}//${hostname}:5050`);

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to MIDI Bridge");
    });

    newSocket.on("sync_state", (serverState: MixState[]) => {
        console.log("Received state:", serverState);
        if (Array.isArray(serverState) && serverState.length > 0) {
            setMixes(serverState);
        }
    });

    newSocket.on("state_updated", (data: any) => {
         const { mixIndex, channelIndex, update } = data;
         setMixes((prev) => {
            if (!prev || !prev[mixIndex]) return prev;
            const newMixes = [...prev];
            if (newMixes[mixIndex]) {
                newMixes[mixIndex] = newMixes[mixIndex].map((ch, i) =>
                    i === channelIndex ? { ...ch, ...update } : ch
                );
            }
            return newMixes;
         });
    });

    newSocket.on("presets_list", (list: string[]) => {
        setPresetList(list);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
    };
  }, []);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        const progress = (scrollLeft / maxScroll) * 100;
        setScrollProgress(progress);
      }
    }
  };

  const handleSliderChange = (value: number[]) => {
    const newVal = value[0];
    setScrollProgress(newVal);

    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const scrollPos = (newVal / 100) * maxScroll;
      scrollContainerRef.current.scrollLeft = scrollPos;
    }
  };

  const updateChannel = (
    channelIndex: number,
    update: Partial<ChannelState>,
    targetMixIndex: number
  ) => {
    setMixes((prev) => {
      if (!prev) return [];
      const newMixes = [...prev];
      if (newMixes[targetMixIndex]) {
        newMixes[targetMixIndex] = newMixes[targetMixIndex].map((channel, i) => {
            if (i === channelIndex) return { ...channel, ...update };
            return channel;
        });
      }
      return newMixes;
    });

    if (socket) {
        socket.emit("update_channel", {
            mixIndex: targetMixIndex,
            channelIndex: channelIndex,
            update: update
        });
    }
  };

  const handleCreateNew = () => {
      if (socket) {
          if(window.confirm(`Create new setup with ${newChannelCount} channels? Unsaved changes will be lost.`)) {
              socket.emit("init_setup", { count: newChannelCount });
              setShowMenu(false);
          }
      }
  };

  const handleSavePreset = () => {
      if (socket && newPresetName) {
          socket.emit("save_preset", newPresetName);
          setNewPresetName("");
          alert("Preset saved!");
      }
  };

  const handleLoadPreset = (name: string) => {
      if (socket) {
          if(window.confirm(`Load preset "${name}"? Current state will be lost.`)) {
            socket.emit("load_preset", name);
            setShowMenu(false);
          }
      }
  };

  const handleDeletePreset = (name: string) => {
      if (socket && window.confirm(`Delete preset "${name}"?`)) {
          socket.emit("delete_preset", name);
      }
  };

  // ------------------------------------------------------------------
  // SAFE RENDER: Check if we have data before rendering deep properties
  // ------------------------------------------------------------------
  const isLoading = !mixes || mixes.length === 0;
  const currentMix = !isLoading ? (mixes[selectedMix] || []) : [];

  return (
    <div
      className="fixed inset-0 bg-[#1a1a1a] flex flex-col items-center overflow-hidden pt-24 landscape:pt-2 lg:landscape:pt-8 pb-safe"
      style={{ height: '100dvh' }}
    >
       {/* Top Right Controls */}
       <div className="absolute top-4 right-4 z-50 flex gap-2">
           <button
            onClick={() => setIsVisibilityMode(!isVisibilityMode)}
            className={`p-2 border rounded transition-colors ${
                isVisibilityMode 
                ? "bg-console-amber text-black border-console-amber" 
                : "bg-console-bakelite text-console-beige border-console-metal/50 hover:bg-console-metal-dark"
            }`}
            title="Toggle Visibility Mode"
           >
             {isVisibilityMode ? <Eye size={20} /> : <EyeOff size={20} />}
           </button>

           <button
            onClick={() => setShowMenu(true)}
            className="p-2 bg-console-bakelite border border-console-metal/50 rounded text-console-beige hover:bg-console-metal-dark transition-colors"
           >
             <Settings size={20} />
           </button>
       </div>

       {/* Menu Modal */}
       {showMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#2a2a2a] w-full max-w-md border-2 border-console-metal rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-console-bakelite p-4 border-b border-console-metal flex justify-between items-center">
                    <h2 className="text-xl font-display text-console-amber tracking-widest">CONFIGURATION</h2>
                    <button onClick={() => setShowMenu(false)} className="text-white/50 hover:text-white">✕</button>
                </div>

                <div className="p-6 overflow-y-auto space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-sm font-mono text-console-beige/70 uppercase tracking-widest border-b border-white/10 pb-1">New Session</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between text-console-beige text-sm">
                                <span>Channel Count:</span>
                                <span className="font-bold text-console-amber">{newChannelCount}</span>
                            </div>
                            <Slider.Root
                                className="relative flex items-center select-none touch-none w-full h-5"
                                value={[newChannelCount]} max={32} min={1} step={1}
                                onValueChange={(v) => setNewChannelCount(v[0])}
                            >
                                <Slider.Track className="bg-black/50 relative grow rounded-full h-[4px]">
                                    <Slider.Range className="absolute bg-console-amber rounded-full h-full" />
                                </Slider.Track>
                                <Slider.Thumb className="block w-5 h-5 bg-console-beige rounded-full shadow hover:bg-white focus:outline-none" />
                            </Slider.Root>
                            <button
                                onClick={handleCreateNew}
                                className="w-full py-2 bg-console-metal-dark hover:bg-console-metal border border-white/10 rounded text-white text-sm font-bold tracking-wider flex items-center justify-center gap-2 transition-all"
                            >
                                <Plus size={16} /> INITIALIZE
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-mono text-console-beige/70 uppercase tracking-widest border-b border-white/10 pb-1">Save Preset</h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                placeholder="Preset Name..."
                                className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-console-amber/50"
                            />
                            <button
                                onClick={handleSavePreset}
                                disabled={!newPresetName}
                                className="px-4 bg-console-green/20 hover:bg-console-green/30 border border-console-green/50 rounded text-console-green disabled:opacity-50 transition-colors"
                            >
                                <Save size={18} />
                            </button>
                        </div>
                    </div>

                     <div className="space-y-4">
                        <h3 className="text-sm font-mono text-console-beige/70 uppercase tracking-widest border-b border-white/10 pb-1">Load Preset</h3>
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {presetList.length === 0 && <span className="text-white/30 text-xs italic">No presets saved.</span>}
                            {presetList.map(preset => (
                                <div key={preset} className="flex items-center justify-between bg-white/5 p-2 rounded hover:bg-white/10 group">
                                    <span className="text-console-beige text-sm font-medium">{preset}</span>
                                    <div className="flex gap-2 opacity-50 group-hover:opacity-100">
                                        <button onClick={() => handleLoadPreset(preset)} className="text-console-amber hover:text-white" title="Load">
                                            <FolderOpen size={16} />
                                        </button>
                                        <button onClick={() => handleDeletePreset(preset)} className="text-red-400 hover:text-red-200" title="Delete">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
       )}

      {/* Content Wrapper */}
      <div className="w-full h-full flex items-center justify-center lg:block">
        <div className="w-full h-full flex flex-col
                        landscape:w-[173.33%] landscape:h-[173.33%] landscape:scale-[0.58] landscape:origin-center
                        lg:landscape:w-full lg:landscape:h-full lg:landscape:scale-100 lg:landscape:origin-top">

          <header className="text-center px-4 shrink-0 relative z-10 pb-2 landscape:hidden lg:landscape:block">
            <div className="inline-block console-panel px-6 py-2 vintage-border relative bg-[#2a2a2a] shadow-lg">
              <div className="absolute top-2 left-2 w-2 h-2 rounded-full screw" />
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full screw" />
              <h1 className="text-xl md:text-4xl font-display text-console-amber text-glow-amber tracking-[0.2em] md:tracking-[0.3em]">
                CUE SYSTEM
              </h1>
            </div>
          </header>

          <div className="flex-1 flex flex-col px-0 md:px-8 py-0 overflow-hidden min-h-0 relative">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex h-full overflow-x-auto overflow-y-hidden scrollbar-hide items-center py-8 landscape:py-2 lg:landscape:py-8 pl-4 md:pl-0"
              style={{
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-x',
                  overscrollBehaviorX: 'contain'
              }}
            >
              <div className="flex-shrink-0 h-fit max-h-none flex items-center mr-4">
                <MixSelector selectedMix={selectedMix} onSelectMix={setSelectedMix} />
              </div>

              <div className="flex gap-1 min-w-max h-fit max-h-none pr-4">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-40 w-60 border border-white/10 rounded bg-black/20 text-console-beige animate-pulse">
                        <span className="font-mono text-sm">CONNECTING...</span>
                        <span className="text-xs text-white/30 mt-2">Waiting for server state</span>
                    </div>
                ) : (
                    currentMix.map((channel, index) => {
                        // Logic for hiding channels
                        if (!isVisibilityMode && channel.isHidden) return null;

                        return (
                        <div key={index} className="relative group/channel">
                            <ChannelStrip
                                channelNumber={index + 1}
                                name={channel.name}
                                faderValue={channel.faderValue}
                                panValue={channel.panValue}
                                isMuted={channel.isMuted}
                                onFaderChange={(value) =>
                                    updateChannel(index, { faderValue: value }, selectedMix)
                                }
                                onPanChange={(value) =>
                                    updateChannel(index, { panValue: value }, selectedMix)
                                }
                                onMuteToggle={() =>
                                    updateChannel(index, { isMuted: !channel.isMuted }, selectedMix)
                                }
                                onNameChange={(name) =>
                                    updateChannel(index, { name }, selectedMix)
                                }
                            />

                            {/* Visibility Overlay (Only in Visibility Mode) */}
                            {isVisibilityMode && (
                                <div className={`absolute inset-0 z-50 flex items-center justify-center backdrop-blur-[2px] transition-all ${channel.isHidden ? 'bg-black/80' : 'bg-black/20 hover:bg-black/40'}`}>
                                    <button
                                        onClick={() => updateChannel(index, { isHidden: !channel.isHidden }, selectedMix)}
                                        className={`p-3 rounded-full transition-transform hover:scale-110 ${channel.isHidden ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-green-500/20 text-green-400 border border-green-500'}`}
                                    >
                                        {channel.isHidden ? <EyeOff size={32} /> : <Eye size={32} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    )})
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-2 shrink-0 pb-8 landscape:pb-2 lg:landscape:pb-8 bg-[#1a1a1a] relative z-10 mt-auto landscape:hidden lg:landscape:block">
             <Slider.Root
              className="relative flex items-center select-none touch-none w-full h-5"
              value={[scrollProgress]}
              max={100}
              step={0.1}
              onValueChange={handleSliderChange}
            >
              <Slider.Track className="bg-black/40 relative grow rounded-full h-[6px] border border-white/10 shadow-inner">
                <Slider.Range className="absolute bg-console-amber/50 rounded-full h-full" />
              </Slider.Track>
              <Slider.Thumb
                className="block w-12 h-4 bg-[#3a3a3a] border border-console-beige/30 shadow-[0_2px_4px_rgba(0,0,0,0.5)] rounded-full focus:outline-none focus:ring-1 focus:ring-console-amber/50 cursor-grab active:cursor-grabbing"
                aria-label="Scroll Console"
              >
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-[2px]">
                      <div className="w-[1px] h-2 bg-black/50" />
                      <div className="w-[1px] h-2 bg-black/50" />
                      <div className="w-[1px] h-2 bg-black/50" />
                   </div>
              </Slider.Thumb>
            </Slider.Root>
          </div>

          {/* Footer */}
          <footer className="text-center pb-2 px-4 shrink-0 hidden lg:block">
            <div className="inline-flex items-center gap-3 px-4 py-2 console-panel vintage-border">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-console-green led-indicator animate-pulse" />
                <span className="text-[9px] font-display text-console-beige tracking-wider uppercase">
                  ON
                </span>
              </div>
              <div className="w-px h-4 brass-trim" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-console-amber led-indicator animate-pulse" />
                <span className="text-[9px] font-mono text-console-beige/70 tracking-wider">
                  SIG
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};