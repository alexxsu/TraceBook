import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Map, ArrowRight } from 'lucide-react';

interface ToastProps {
  message: string;
  mapName?: string;
  isVisible: boolean;
  onHide: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  mapName,
  isVisible,
  onHide,
  duration = 3000
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Trigger animation after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingIn(true);
        });
      });

      const hideTimer = setTimeout(() => {
        setIsAnimatingIn(false);
        setTimeout(() => {
          setShouldRender(false);
          onHide();
        }, 300);
      }, duration);

      return () => clearTimeout(hideTimer);
    } else {
      setIsAnimatingIn(false);
    }
  }, [isVisible, duration, onHide]);

  if (!shouldRender) return null;

  const toast = (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[200] pointer-events-none">
      <div
        className={`
          flex items-center gap-3 px-4 py-3
          bg-gray-800/95 backdrop-blur-md border border-gray-600
          rounded-xl shadow-2xl
          transition-all duration-300 ease-out
          ${isAnimatingIn
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-6 scale-95'
          }
        `}
      >
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Map size={18} className="text-blue-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-white text-sm font-medium">{message}</span>
          {mapName && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <ArrowRight size={12} />
              <span>{mapName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(toast, document.body);
};
