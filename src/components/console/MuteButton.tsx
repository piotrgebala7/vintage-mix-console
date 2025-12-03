interface MuteButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

export const MuteButton = ({ isMuted, onToggle }: MuteButtonProps) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[8px] font-display tracking-wider embossed-text">MUTE</span>
      <button
        onClick={onToggle}
        className={`w-11 h-7 rounded-sm font-display text-xs tracking-wider transition-all duration-150 relative ${
          isMuted
            ? "mute-button-active text-destructive-foreground"
            : "mute-button text-console-beige/70 hover:text-console-beige"
        }`}
      >
        <span className="relative z-10">{isMuted ? "ON" : "OFF"}</span>
        
        {/* LED glow effect when active */}
        {isMuted && (
          <div className="absolute inset-0 rounded-sm bg-console-red/20 animate-glow-pulse" />
        )}
      </button>
    </div>
  );
};
