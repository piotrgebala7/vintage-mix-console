interface MixSelectorProps {
  selectedMix: number;
  onSelectMix: (mix: number) => void;
}

export const MixSelector = ({ selectedMix, onSelectMix }: MixSelectorProps) => {
  const mixes = [
    { id: 0, name: "MIX A", label: "DRUMS" },
    { id: 1, name: "MIX B", label: "BASS" },
    { id: 2, name: "MIX C", label: "GUITAR" },
    { id: 3, name: "MIX D", label: "VOCAL" },
  ];

  return (
    <div className="flex flex-col gap-3 p-5 console-panel vintage-border h-fit relative">
      {/* Corner screws */}
      <div className="absolute top-2.5 left-2.5 w-3 h-3 rounded-full screw" />
      <div className="absolute top-2.5 right-2.5 w-3 h-3 rounded-full screw" />
      <div className="absolute bottom-2.5 left-2.5 w-3 h-3 rounded-full screw" />
      <div className="absolute bottom-2.5 right-2.5 w-3 h-3 rounded-full screw" />

      {/* Section label - engraved nameplate */}
      <div className="text-center mb-3 pt-2">
        <div className="inline-block px-4 py-1.5 bg-console-metal-dark/40 rounded-sm border border-console-bakelite/60">
          <span className="text-sm font-display tracking-[0.25em] embossed-text">
            CUE SELECT
          </span>
        </div>
      </div>

      {/* Mix buttons */}
      <div className="flex flex-col gap-3">
        {mixes.map((mix) => (
          <button
            key={mix.id}
            onClick={() => onSelectMix(mix.id)}
            className={`relative px-5 py-3.5 rounded-[3px] font-display text-sm tracking-[0.15em] transition-all duration-100 ${
              selectedMix === mix.id
                ? "mix-button-active text-white"
                : "mix-button text-console-beige hover:text-foreground"
            }`}
          >
            {/* Button highlight */}
            <div className="absolute inset-0 rounded-[3px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/8 to-transparent" />
            </div>

            <div className="relative flex flex-col items-center gap-1">
              <span className={`text-base font-bold ${selectedMix === mix.id ? 'text-glow-green' : ''}`}>
                {mix.name}
              </span>
              <span className="text-[9px] font-mono tracking-wider opacity-75">
                {mix.label}
              </span>
            </div>
            
            {/* LED indicator */}
            {selectedMix === mix.id && (
              <div 
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-console-green led-indicator animate-pulse"
                style={{ animationDuration: '1.5s' }}
              />
            )}

            {/* Inner glow when active */}
            {selectedMix === mix.id && (
              <div className="absolute inset-x-3 top-1.5 h-1 bg-gradient-to-b from-green-300/30 to-transparent rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Decorative brass trim */}
      <div className="mt-3 h-[2px] brass-trim rounded-full" />
      
      {/* Model badge */}
      <div className="text-center mt-1">
        <div className="inline-block px-3 py-1 bg-console-bakelite/50 rounded-sm">
          <span className="text-[9px] font-mono text-console-brass tracking-[0.2em]">
            MODEL PM-400
          </span>
        </div>
      </div>
    </div>
  );
};