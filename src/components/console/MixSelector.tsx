interface MixSelectorProps {
  selectedMix: number;
  onSelectMix: (mix: number) => void;
}

export const MixSelector = ({ selectedMix, onSelectMix }: MixSelectorProps) => {
  const mixes = [
    { id: 0, name: "MIX A",    label: "DRUMS"   },
    { id: 1, name: "MIX B",    label: "BASS"    },
    { id: 2, name: "MIX C",    label: "GUITAR"  },
    { id: 3, name: "MIX D",    label: "VOCAL"   },
    { id: 4, name: "MONITOR",  label: "MAIN MIX" },
  ];

  return (
    // Changed p-5 to p-3 to reduce height, gap-3 to gap-2
    <div className="flex flex-col gap-2 p-3 md:p-5 console-panel vintage-border h-fit relative">
      {/* Corner screws */}
      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 rounded-full screw" />

      {/* Section label */}
      <div className="text-center mb-2 pt-1">
        <div className="inline-block px-3 py-1 bg-console-metal-dark/40 rounded-sm border border-console-bakelite/60">
          <span className="text-xs md:text-sm font-display tracking-[0.25em] embossed-text">
            CUE SELECT
          </span>
        </div>
      </div>

      {/* Mix buttons */}
      <div className="flex flex-col gap-2"> {/* Reduced gap */}
        {mixes.map((mix) => (
          <button
            key={mix.id}
            onClick={() => onSelectMix(mix.id)}
            // Reduced padding y (py-2.5) to make buttons shorter
            className={`relative px-4 py-2.5 md:px-5 md:py-3.5 rounded-[3px] font-display text-sm tracking-[0.15em] transition-all duration-100 ${
              selectedMix === mix.id
                ? "mix-button-active text-white"
                : "mix-button text-console-beige hover:text-foreground"
            }`}
            style={mix.id === 4 && selectedMix === mix.id
              ? { boxShadow: "0 0 10px rgba(200,150,12,0.4), inset 0 1px 0 rgba(255,220,80,0.15)" }
              : undefined}
          >
            {/* Button highlight */}
            <div className="absolute inset-0 rounded-[3px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/8 to-transparent" />
            </div>

            <div className="relative flex flex-col items-center gap-0.5 md:gap-1">
              <span className={`text-sm md:text-base font-bold ${
                selectedMix === mix.id
                  ? mix.id === 4 ? '' : 'text-glow-green'
                  : ''
              }`}
                style={selectedMix === mix.id && mix.id === 4
                  ? { color: "#f0c040", textShadow: "0 0 8px rgba(200,150,12,0.6)" }
                  : undefined}
              >
                {mix.name}
              </span>
              <span className="text-[8px] md:text-[9px] font-mono tracking-wider opacity-75">
                {mix.label}
              </span>
            </div>

            {/* LED indicator */}
            {selectedMix === mix.id && (
              <div
                className="absolute -top-1 -right-1 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full led-indicator animate-pulse"
                style={{
                  animationDuration: '1.5s',
                  background: mix.id === 4 ? "#c8960c" : undefined,
                  boxShadow: mix.id === 4 ? "0 0 6px rgba(200,150,12,0.8)" : undefined,
                }}
              />
            )}

            {/* Inner glow when active */}
            {selectedMix === mix.id && (
              <div className={`absolute inset-x-3 top-1 h-0.5 rounded-full bg-gradient-to-b ${
                mix.id === 4 ? "from-yellow-300/30" : "from-green-300/30"
              } to-transparent`} />
            )}
          </button>
        ))}
      </div>

      {/* Decorative brass trim */}
      <div className="mt-2 md:mt-3 h-[2px] brass-trim rounded-full" />

      {/* Model badge */}
      <div className="text-center mt-0.5 md:mt-1">
        <div className="inline-block px-2 py-0.5 md:px-3 md:py-1 bg-console-bakelite/50 rounded-sm">
          <span className="text-[8px] md:text-[9px] font-mono text-console-brass tracking-[0.2em]">
            MODEL PM-400
          </span>
        </div>
      </div>
    </div>
  );
};