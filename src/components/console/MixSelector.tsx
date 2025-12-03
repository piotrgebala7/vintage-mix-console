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
    <div className="flex flex-col gap-3 p-4 console-panel vintage-border h-fit relative">
      {/* Corner screws */}
      <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full screw" />
      <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full screw" />

      {/* Section label */}
      <div className="text-center mb-2 pt-2">
        <span className="text-sm font-display tracking-[0.2em] embossed-text">
          CUE SELECT
        </span>
      </div>

      {/* Mix buttons */}
      <div className="flex flex-col gap-3">
        {mixes.map((mix) => (
          <button
            key={mix.id}
            onClick={() => onSelectMix(mix.id)}
            className={`relative px-4 py-3 rounded-sm font-display text-sm tracking-[0.15em] transition-all duration-150 ${
              selectedMix === mix.id
                ? "mix-button-active text-background"
                : "mix-button text-console-beige hover:text-foreground"
            }`}
          >
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-base">{mix.name}</span>
              <span className="text-[9px] font-mono tracking-wider opacity-70">
                {mix.label}
              </span>
            </div>
            
            {/* LED indicator */}
            {selectedMix === mix.id && (
              <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-console-green led-indicator animate-glow-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Decorative line */}
      <div className="mt-2 h-px bg-gradient-to-r from-transparent via-console-brass/50 to-transparent" />
      
      {/* Model number */}
      <div className="text-center">
        <span className="text-[8px] font-mono text-console-beige/50 tracking-widest">
          MODEL PM-400
        </span>
      </div>
    </div>
  );
};
