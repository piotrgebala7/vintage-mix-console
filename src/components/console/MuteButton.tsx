interface MuteButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

export const MuteButton = ({ isMuted, onToggle }: MuteButtonProps) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[8px] font-display tracking-[0.15em] embossed-text font-bold">MUTE</span>
      <button
        onClick={onToggle}
        className={`w-12 h-8 rounded-[3px] font-display text-xs tracking-wider transition-all duration-100 relative overflow-hidden ${
          isMuted
            ? "mute-button-active text-white"
            : "mute-button text-console-beige/70 hover:text-console-beige"
        }`}
      >
        {/* Button surface texture */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent" />
        </div>
        
        <span className={`relative z-10 font-bold ${isMuted ? 'text-glow-red' : ''}`}>
          {isMuted ? "ON" : "OFF"}
        </span>
        
        {/* Pulsing glow effect when active */}
        {isMuted && (
          <>
            <div className="absolute inset-0 bg-console-red/20 animate-pulse" style={{ animationDuration: '0.8s' }} />
            {/* Inner highlight */}
            <div className="absolute inset-x-2 top-1 h-1 bg-gradient-to-b from-red-300/40 to-transparent rounded-full" />
          </>
        )}
      </button>
    </div>
  );
};