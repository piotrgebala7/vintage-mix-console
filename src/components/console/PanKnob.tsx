import { useState, useEffect, useRef } from "react";

interface PanKnobProps {
  value: number; // 0-100, where 50 is center
  onChange: (value: number) => void;
}

const PanKnob = ({ value, onChange }: PanKnobProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const prevY = useRef<number>(0);
  const lastTapTime = useRef<number>(0); // For double tap detection

  // Map 0-100 to rotation (-135 to 135 degrees)
  const rotation = ((value - 50) / 50) * 135;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      updateValue(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      // Prevent scrolling while rotating knob
      if (e.cancelable) e.preventDefault();
      updateValue(e.touches[0].clientY);
    };

    const updateValue = (clientY: number) => {
      const deltaY = prevY.current - clientY;
      prevY.current = clientY;

      // Sensitivity factor
      const change = deltaY * 0.8;

      const newValue = Math.min(100, Math.max(0, value + change));
      if (newValue !== value) {
        onChange(newValue);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = "default";
      document.body.style.touchAction = ""; // Restore scrolling
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleEnd);

      document.body.style.touchAction = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
      document.body.style.touchAction = "";
    };
  }, [isDragging, value, onChange]);

  const checkForDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) { // 300ms threshold for double tap
      onChange(50); // Reset to center
      setIsDragging(false); // Stop dragging immediately
      lastTapTime.current = 0; // Reset timer
      return true;
    }
    lastTapTime.current = now;
    return false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (checkForDoubleTap()) return;

    setIsDragging(true);
    prevY.current = e.clientY;
    document.body.style.cursor = "ns-resize";
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (checkForDoubleTap()) return;

    setIsDragging(true);
    prevY.current = e.touches[0].clientY;
  };

  return (
    <div className="relative w-12 h-12 flex items-center justify-center touch-none">
      {/* Markers */}
      <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-console-beige/40 pointer-events-none" />
      <div className="absolute top-[25%] left-[15%] w-0.5 h-1 bg-console-beige/20 -rotate-45 pointer-events-none" />
      <div className="absolute top-[25%] right-[15%] w-0.5 h-1 bg-console-beige/20 rotate-45 pointer-events-none" />

      {/* Knob Body */}
      <div
        className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.1)] border border-black cursor-ns-resize relative transform transition-transform duration-75 ease-out z-10"
        style={{ transform: `rotate(${rotation}deg)` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Indicator Line */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-3 bg-white rounded-full shadow-[0_0_2px_rgba(255,255,255,0.5)] pointer-events-none" />

        {/* Metallic top sheen */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};

export default PanKnob;