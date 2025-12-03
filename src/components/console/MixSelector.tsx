interface MixSelectorProps {
  selectedMix: number;
  onSelectMix: (mix: number) => void;
}

const mixNames = ["Mix A", "Mix B", "Mix C", "Mix D"];

export const MixSelector = ({ selectedMix, onSelectMix }: MixSelectorProps) => {
  return (
    <div className="flex flex-col gap-3 p-4 console-metal rounded border border-console-metal-light/20">
      {/* Header */}
      <div className="text-center">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          Select Mix
        </div>
        <div className="text-sm font-mono font-semibold text-console-amber text-glow-amber">
          {mixNames[selectedMix]}
        </div>
      </div>

      {/* Mix buttons */}
      <div className="grid grid-cols-2 gap-2">
        {mixNames.map((name, index) => (
          <button
            key={index}
            onClick={() => onSelectMix(index)}
            className={`px-3 py-2 rounded-sm font-mono text-xs font-semibold uppercase tracking-wide transition-all duration-150 ${
              selectedMix === index
                ? "mix-button-active text-primary-foreground"
                : "mix-button text-muted-foreground hover:text-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Decorative screws */}
      <div className="flex justify-between px-1 mt-2">
        <div className="w-2 h-2 rounded-full screw" />
        <div className="w-2 h-2 rounded-full screw" />
      </div>
    </div>
  );
};
