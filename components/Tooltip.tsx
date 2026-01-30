import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, className = '' }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left,
      });
    }
  };

  const hideTooltip = () => {
    setPosition(null);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onTouchStart={showTooltip}
        onTouchEnd={hideTooltip}
        className={className}
      >
        {children}
      </div>
      {position && createPortal(
        <div
          className="fixed z-[9999] px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-xl pointer-events-none min-w-[120px]"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="absolute top-full left-3 border-4 border-transparent border-t-slate-700"></div>
          <div className="text-[0.5625rem] text-slate-200">{content}</div>
        </div>,
        document.body
      )}
    </>
  );
};
