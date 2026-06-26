import { useState, useEffect, useRef } from "react";
import { ChannelStrip } from "./ChannelStrip";
import { VintageChannelStrip } from "./VintageChannelStrip";
import { MixSelector } from "./MixSelector";
import { io, Socket } from "socket.io-client";
import * as Slider from "@radix-ui/react-slider";
import { Settings, Eye, EyeOff, LayoutGrid } from "lucide-react";

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
  const [diagMode, setDiagMode] = useState(false);

  // Visibility Mode State
  const [isVisibilityMode, setIsVisibilityMode] = useState(false);

  // View mode
  const [isVintageView, setIsVintageView] = useState(false);

  // Detekcja urządzenia dotykowego — coarse pointer = palec, fine = mysz
  const isTouchDevice = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
  )[0];

  // Grupowanie kanałów
  const GROUP_CYCLE = ["A", "B", "C", "D"] as const;
  const GROUP_COLORS: Record<string, string> = { A: "#ef4444", B: "#22c55e", C: "#3b82f6", D: "#f97316" };
  // Grupowanie per miks: channelGroups[mixIdx][chIdx] = "A"|"B"|"C"|"D"
  const [channelGroups, setChannelGroups]   = useState<Record<number, Record<number, string>>>({});
  const [bypassedGroups, setBypassedGroups] = useState<Record<number, Set<string>>>({});
  const [selectedFader, setSelectedFader]   = useState<number | null>(null);
  const [stereoList, setStereoList]         = useState<boolean[]>([]);

  // VU metery – dane z UAD Console
  const [allMeterLevels, setAllMeterLevels] = useState<Record<string, number>>({});
  const selectedMixRef = useRef(selectedMix);
  useEffect(() => { selectedMixRef.current = selectedMix; }, [selectedMix]);

  // Snapshot wartości faderów w momencie rozpoczęcia przeciągania w grupie.
  // Klucz: `${mixIdx}_${chIdx}`. Delta zawsze liczona od snapshota, nie od poprzedniego eventu.
  const dragSnapshot = useRef<Record<string, number> | null>(null);
  const dragStartVal = useRef<number>(0);

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


    newSocket.on("channel_info", (data: { stereo: boolean[] }) => {
        console.log("channel_info received:", data.stereo);
        setStereoList(data.stereo);
    });

    newSocket.on("meters_batch", (data: Array<{ c: number; m: number; v: number }>) => {
        setAllMeterLevels(prev => {
            const next = { ...prev };
            data.forEach(({ c, m, v }) => { next[`${m}_${c}`] = v; });
            return next;
        });
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

  const cycleGroup = (chIdx: number) => {
    setChannelGroups(prev => {
      const mixGroups = { ...(prev[selectedMix] ?? {}) };
      const current   = mixGroups[chIdx];
      const currPos   = current ? GROUP_CYCLE.indexOf(current as typeof GROUP_CYCLE[number]) : -1;
      const next      = GROUP_CYCLE[currPos + 1];
      if (next) { mixGroups[chIdx] = next; } else { delete mixGroups[chIdx]; }
      return { ...prev, [selectedMix]: mixGroups };
    });
  };

  const updateChannel = (
    chIdx: number,
    update: Partial<ChannelState>,
    mixIdx: number
  ) => {
    const mixGroups  = channelGroups[mixIdx] ?? {};
    const group      = mixGroups[chIdx];
    const bypassed   = bypassedGroups[mixIdx] ?? new Set<string>();
    const currentMix = mixes[mixIdx] || [];

    // Grupowe propagowanie — wyłączone jeśli grupa jest bypassowana
    const targets = (group && !bypassed.has(group))
      ? Object.entries(mixGroups).filter(([, g]) => g === group).map(([i]) => Number(i))
      : [chIdx];

    // Oblicz finalne wartości (fader relatywny od snapshota, pan/mute absolutny)
    const computed = targets.map(idx => {
      let u = { ...update };
      if ("faderValue" in update && group && idx !== chIdx) {
        // Snapshot tworzony przy pierwszym ruchu fadera w tej sesji przeciągania
        if (!dragSnapshot.current) {
          dragSnapshot.current = {};
          dragStartVal.current = currentMix[chIdx]?.faderValue ?? 0;
          for (const t of targets) {
            dragSnapshot.current[`${mixIdx}_${t}`] = currentMix[t]?.faderValue ?? 0;
          }
        }
        const delta    = update.faderValue! - dragStartVal.current;
        const snapVal  = dragSnapshot.current[`${mixIdx}_${idx}`] ?? (currentMix[idx]?.faderValue ?? 0);
        u = { ...u, faderValue: Math.max(-144, Math.min(12, snapVal + delta)) };
      }
      return { idx, u };
    });

    setMixes(prev => {
      if (!prev) return [];
      const newMixes = [...prev];
      if (!newMixes[mixIdx]) return newMixes;
      const newMix = [...newMixes[mixIdx]];
      for (const { idx, u } of computed) {
        if (idx < newMix.length) newMix[idx] = { ...newMix[idx], ...u };
      }
      newMixes[mixIdx] = newMix;
      return newMixes;
    });

    if (socket) {
      for (const { idx, u } of computed) {
        socket.emit("update_channel", { mixIndex: mixIdx, channelIndex: idx, update: u });
      }
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
            onClick={() => setIsVintageView(!isVintageView)}
            className={`p-2 border rounded transition-colors ${
                isVintageView
                ? "bg-console-amber text-black border-console-amber"
                : "bg-console-bakelite text-console-beige border-console-metal/50 hover:bg-console-metal-dark"
            }`}
            title="Toggle Vintage View"
           >
             <LayoutGrid size={20} />
           </button>

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

                <div className="p-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-mono text-console-beige/70 uppercase tracking-widest border-b border-white/10 pb-1">Diagnostics</h3>
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-console-beige text-sm">Diagnostic Mode</span>
                                <span className="text-white/30 text-xs">Logs unknown UAD paths to server console</span>
                            </div>
                            <button
                                onClick={() => {
                                    const next = !diagMode;
                                    setDiagMode(next);
                                    socket?.emit("set_diagnostics", { enabled: next });
                                }}
                                className={`px-4 py-1.5 rounded text-xs font-bold tracking-wider border transition-all ${
                                    diagMode
                                        ? "bg-console-amber/20 border-console-amber text-console-amber"
                                        : "bg-black/30 border-white/20 text-white/40"
                                }`}
                            >
                                {diagMode ? "ON" : "OFF"}
                            </button>
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
              onPointerDown={() => setSelectedFader(null)}
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

                        const stripProps = {
                            channelNumber: index + 1,
                            name: channel.name,
                            faderValue: channel.faderValue,
                            panValue: channel.panValue,
                            isMuted: channel.isMuted,
                            meterLevel: allMeterLevels[`${selectedMix}_${index}`] ?? -77,
                            group: (channelGroups[selectedMix] ?? {})[index],
                            isFaderSelected: selectedFader === index,
                            onFaderSelect: () => setSelectedFader(index),
                            onFaderChange: (value: number) =>
                                updateChannel(index, { faderValue: value }, selectedMix),
                            onFaderDragEnd: () => { dragSnapshot.current = null; },
                            onPanChange: (value: number) =>
                                updateChannel(index, { panValue: value }, selectedMix),
                            onMuteToggle: () =>
                                updateChannel(index, { isMuted: !channel.isMuted }, selectedMix),
                            onNameChange: (name: string) =>
                                updateChannel(index, { name }, selectedMix),
                            isStereo: stereoList[index] ?? false,
                            requireFaderSelect: isTouchDevice,
                            onGroupChange: () => cycleGroup(index),
                            groupBypassed: (() => {
                                const g = (channelGroups[selectedMix] ?? {})[index];
                                return g ? (bypassedGroups[selectedMix] ?? new Set()).has(g) : false;
                            })(),
                            onGroupBypass: () => {
                                const g = (channelGroups[selectedMix] ?? {})[index];
                                if (!g) return;
                                setBypassedGroups(prev => {
                                    const mixSet = new Set(prev[selectedMix] ?? []);
                                    mixSet.has(g) ? mixSet.delete(g) : mixSet.add(g);
                                    return { ...prev, [selectedMix]: mixSet };
                                });
                            },
                        };

                        return (
                        <div key={index} className="relative group/channel">
                            {isVintageView
                                ? <VintageChannelStrip {...stripProps} />
                                : <ChannelStrip {...stripProps} />
                            }

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