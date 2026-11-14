import React, { useRef, useState, useEffect } from 'react';

interface TouchJoystickProps {
  onMove: (vector: { x: number; y: number }, isSprinting: boolean) => void;
  disabled?: boolean;
}

export const TouchJoystick: React.FC<TouchJoystickProps> = ({ onMove, disabled = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [basePos, setBasePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [touchId, setTouchId] = useState<number | null>(null);

  const maxRadius = 50; // px
  const deadZone = 0.12;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (disabled) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        // Only trigger if touch down is on left 50% and lower 70% of screen
        if (touch.clientX < window.innerWidth * 0.5 && touch.clientY > window.innerHeight * 0.3) {
          setIsActive(true);
          setTouchId(touch.identifier);
          setBasePos({ x: touch.clientX, y: touch.clientY });
          setKnobPos({ x: 0, y: 0 });
          onMove({ x: 0, y: 0 }, false);
          break;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isActive || touchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId) {
          const dx = touch.clientX - basePos.x;
          const dy = touch.clientY - basePos.y;
          const dist = Math.hypot(dx, dy);

          const clampedDist = Math.min(dist, maxRadius);
          const angle = Math.atan2(dy, dx);

          const knobX = Math.cos(angle) * clampedDist;
          const knobY = Math.sin(angle) * clampedDist;
          setKnobPos({ x: knobX, y: knobY });

          const normalizedDist = clampedDist / maxRadius;
          if (normalizedDist < deadZone) {
            onMove({ x: 0, y: 0 }, false);
          } else {
            const normX = knobX / maxRadius;
            const normY = -knobY / maxRadius; // inverted Y for 3D forward
            const isAutoSprint = normalizedDist > 0.88;
            onMove({ x: normX, y: normY }, isAutoSprint);
          }
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isActive || touchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === touchId) {
          setIsActive(false);
          setTouchId(null);
          setKnobPos({ x: 0, y: 0 });
          onMove({ x: 0, y: 0 }, false);
          break;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isActive, touchId, basePos, disabled, onMove]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2"
      style={{ left: basePos.x, top: basePos.y }}
    >
      {/* Outer Joystick Ring */}
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-emerald-400/50 bg-slate-950/60 shadow-2xl backdrop-blur-sm">
        {/* Subtle Cardinal Guides */}
        <div className="absolute h-full w-[1px] bg-emerald-400/20" />
        <div className="absolute h-[1px] w-full bg-emerald-400/20" />

        {/* Floating Knob */}
        <div
          className="h-12 w-12 rounded-full border border-emerald-300 bg-gradient-to-br from-emerald-500 to-teal-700 shadow-lg shadow-emerald-950/50 flex items-center justify-center"
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: 'transform 0.05s linear'
          }}
        >
          <div className="h-4 w-4 rounded-full bg-emerald-200/80" />
        </div>
      </div>
    </div>
  );
};
