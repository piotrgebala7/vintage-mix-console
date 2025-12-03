import { cn } from "@/lib/utils";

interface MuteButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

const MuteButton = ({ isMuted, onToggle }: MuteButtonProps) => {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-10 h-8 rounded shadow-sm flex items-center justify-center text-[10px] font-bold transition-all duration-100 relative overflow-hidden border-b-2 active:border-b-0 active:translate-y-[2px]",
        isMuted
          ? "bg-red-700 border-red-900 text-red-100 shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)]"
          : "bg-[#dcdcdc] border-[#a0a0a0] text-gray-600 hover:bg-gray-100"
      )}
    >
      {isMuted && (
        <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none" />
      )}
      <span className="relative z-10">MUTE</span>
    </button>
  );
};

export default MuteButton;