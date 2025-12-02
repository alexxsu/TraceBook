
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageSliderProps {
  photos: string[];
}

const ImageSlider: React.FC<ImageSliderProps> = ({ photos }) => {
  const [index, setIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  // Touch state for swipe detection
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  if (!photos || photos.length === 0) return <div className="h-48 bg-gray-800" />;

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev + 1) % photos.length);
  };

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (e.key === 'ArrowRight') {
        setIndex((prev) => (prev + 1) % photos.length);
      } else if (e.key === 'ArrowLeft') {
        setIndex((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, photos.length]);

  // Touch Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      setIndex((prev) => (prev + 1) % photos.length);
    } else if (isRightSwipe) {
      setIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <>
      <div 
        className="h-48 w-full relative group overflow-hidden bg-gray-900 cursor-zoom-in"
        onClick={() => setIsLightboxOpen(true)}
      >
        {/* Carousel Container */}
        <div 
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {photos.map((photo, i) => (
            <img 
              key={i}
              src={photo} 
              className="w-full h-full object-cover flex-shrink-0" 
              alt={`Food ${i + 1}`} 
            />
          ))}
        </div>
        
        {photos.length > 1 && (
          <>
            <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none">
              <button onClick={prev} className="pointer-events-auto bg-black/50 hover:bg-black/70 p-1 rounded-full text-white backdrop-blur-sm">
                <ChevronLeft size={16} />
              </button>
              <button onClick={next} className="pointer-events-auto bg-black/50 hover:bg-black/70 p-1 rounded-full text-white backdrop-blur-sm">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-20 pointer-events-none">
               {photos.map((_, i) => (
                 <div key={i} className={`w-1.5 h-1.5 rounded-full shadow-sm transition-colors ${i === index ? 'bg-white' : 'bg-white/40'}`} />
               ))}
            </div>
            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white z-10 border border-white/10 pointer-events-none">
              {index + 1}/{photos.length}
            </div>
          </>
        )}
      </div>

      {/* Fullscreen Lightbox Portal */}
      {isLightboxOpen && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Close Button - Top Right (Fixed Position) */}
          <button 
             className="absolute top-4 right-4 z-[60] p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all cursor-pointer hover:scale-105"
             onClick={(e) => {
               e.stopPropagation();
               setIsLightboxOpen(false);
             }}
          >
            <X size={32} />
          </button>

          {/* Navigation - Left */}
          {photos.length > 1 && (
             <button 
               onClick={prev} 
               className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95"
             >
               <ChevronLeft size={40} />
             </button>
          )}

           {/* Navigation - Right */}
          {photos.length > 1 && (
             <button 
               onClick={next} 
               className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 z-[60] p-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95"
             >
               <ChevronRight size={40} />
             </button>
          )}

          {/* Main Image Slider Track */}
          <div className="w-full h-full overflow-hidden">
            <div 
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {photos.map((photo, i) => (
                <div key={i} className="w-full h-full flex-shrink-0 flex items-center justify-center p-2 md:p-12">
                   <img 
                     src={photo} 
                     className="max-w-full max-h-full object-contain shadow-2xl select-none"
                     alt={`Full view ${i + 1}`}
                     onClick={(e) => {
                        // Prevent click on image from closing the lightbox
                        e.stopPropagation();
                     }}
                   />
                </div>
              ))}
            </div>
          </div>

           {/* Pagination Dots - Bottom */}
           {photos.length > 1 && (
             <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3 z-50" onClick={(e) => e.stopPropagation()}>
                {photos.map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => setIndex(i)}
                    className={`w-3 h-3 rounded-full transition-all cursor-pointer ${i === index ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'}`} 
                  />
                ))}
             </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default ImageSlider;
