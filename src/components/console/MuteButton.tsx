interface MuteButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

export const MuteButton = ({ isMuted, onToggle }: MuteButtonProps) => {
  return (
    <button
      onClick={onToggle}
      className={`w-10 h-6 rounded-sm font-mono text-[10px] font-semibold uppercase tracking-wider transition-all duration-150 ${
        isMuted 
          ? "mute-button-active text-destructive-foreground" 
          : "mute-button text-muted-foreground hover:text-foreground"
      }`}
    >
      {isMuted ? "M" : "M"}
    </button>
  );
};
