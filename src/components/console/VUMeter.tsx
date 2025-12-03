interface VUMeterProps {
  level: number; // 0-100
}

export const VUMeter = ({ level }: VUMeterProps) => {
  const segments = [
    { threshold: 5, color: 'bg-green-600', glowColor: 'shadow-green-500/50' },
    { threshold: 15, color: 'bg-green-600', glowColor: 'shadow-green-500/50' },
    { threshold: 25, color: 'bg-green-500', glowColor: 'shadow-green-400/50' },
    { threshold: 35, color: 'bg-green-500', glowColor: 'shadow-green-400/50' },
    { threshold: 45, color: 'bg-yellow-500', glowColor: 'shadow-yellow-400/50' },
    { threshold: 55, color: 'bg-yellow-500', glowColor: 'shadow-yellow-400/50' },
    { threshold: 65, color: 'bg-yellow-400', glowColor: 'shadow-yellow-300/50' },
    { threshold: 78, color: 'bg-orange-500', glowColor: 'shadow-orange-400/50' },
    { threshold: 88, color: 'bg-red-500', glowColor: 'shadow-red-400/50' },
    { threshold: 95, color: 'bg-red-600', glowColor: 'shadow-red-500/60' },
  ];

  return (
    <div className="flex flex-col gap-[2px] p-1.5 bg-console-groove rounded-sm recessed-display">
      {segments.map((segment, index) => {
        const isOn = level >= segment.threshold;
        const reverseIndex = segments.length - 1 - index;
        
        return (
          <div
            key={index}
            className={`w-5 h-1.5 rounded-[1px] transition-all duration-75 vu-led ${
              isOn 
                ? `${segments[reverseIndex].color} vu-led-on` 
                : 'bg-console-bakelite/80'
            }`}
          />
        );
      }).reverse()}
    </div>
  );
};