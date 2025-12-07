import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { Navigation, Building2, Map, Loader2 } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface MapControlsProps {
  mapType: 'satellite' | 'roadmap' | 'dark';
  onLocateUser: () => void;
  onZoomToCity: () => void;
  onToggleMapType: () => void;
  isLocating?: boolean;
}

export interface MapControlsRef {
  resetClickState: () => void;
}

export const MapControls = forwardRef<MapControlsRef, MapControlsProps>(({
  mapType,
  onLocateUser,
  onZoomToCity,
  onToggleMapType,
  isLocating = false
}, ref) => {
  const { t } = useLanguage();
  const [clickedButton, setClickedButton] = useState<'locate' | 'city' | 'mapType' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getMapTypeTitle = () => {
    if (mapType === 'satellite') return t('switchToRoad');
    if (mapType === 'roadmap') return t('switchToDark');
    return t('switchToSatellite');
  };

  useImperativeHandle(ref, () => ({
    resetClickState: () => {
      setClickedButton(null);
    }
  }));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setClickedButton(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Reset clicked state when location finishes
  useEffect(() => {
    if (!isLocating) {
      // Keep the visual feedback briefly after locating completes
      const timer = setTimeout(() => {
        setClickedButton(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLocating]);

  const handleLocateClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLocating) return; // Prevent double clicks while locating
    setClickedButton('locate');
    onLocateUser();
    e.currentTarget.blur();
  };

  const handleCityClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isLocating) return; // Prevent double clicks while locating
    setClickedButton('city');
    onZoomToCity();
    e.currentTarget.blur();
  };

  const handleMapTypeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setClickedButton('mapType');
    onToggleMapType();
    e.currentTarget.blur();
  };

  const isLocateActive = clickedButton === 'locate' || (isLocating && clickedButton === 'locate');
  const isCityActive = clickedButton === 'city' || (isLocating && clickedButton === 'city');

  return (
    <div ref={containerRef} data-tutorial="map-controls" className="absolute bottom-24 right-4 z-10 flex flex-col gap-3 pointer-events-auto">
      {/* Locate Me Button */}
      <button
        onClick={handleLocateClick}
        disabled={isLocating}
        className={`
          bg-gray-800/90 backdrop-blur border p-3 rounded-full shadow-lg text-white 
          hover:bg-gray-700 active:bg-gray-600 transition group focus:outline-none focus:ring-0
          ${isLocateActive ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-gray-700'}
          ${isLocating ? 'cursor-wait' : ''}
        `}
        title={t('locateMe') || 'Find my location'}
      >
        {isLocating && clickedButton === 'locate' ? (
          <Loader2 size={24} className="animate-spin text-blue-400" />
        ) : (
          <Navigation 
            size={24} 
            className={`transition ${isLocateActive ? 'text-blue-400' : 'group-hover:text-blue-400 group-active:text-blue-300'}`}
            style={{ transform: 'rotate(45deg)' }}
          />
        )}
      </button>

      {/* City View Button */}
      <button
        onClick={handleCityClick}
        disabled={isLocating}
        className={`
          bg-gray-800/90 backdrop-blur border p-3 rounded-full shadow-lg text-white 
          hover:bg-gray-700 active:bg-gray-600 transition group focus:outline-none focus:ring-0
          ${isCityActive ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-gray-700'}
          ${isLocating ? 'cursor-wait' : ''}
        `}
        title={t('zoomToCity') || 'View city'}
      >
        {isLocating && clickedButton === 'city' ? (
          <Loader2 size={24} className="animate-spin text-purple-400" />
        ) : (
          <Building2 
            size={24} 
            className={`transition ${isCityActive ? 'text-purple-400' : 'group-hover:text-purple-400 group-active:text-purple-300'}`}
          />
        )}
      </button>

      {/* Map Type Button */}
      <button
        onClick={handleMapTypeClick}
        className={`bg-gray-800/90 backdrop-blur border p-3 rounded-full shadow-lg text-white transition group focus:outline-none focus:ring-0 active:bg-gray-600
          ${clickedButton === 'mapType' 
            ? 'border-blue-500 ring-2 ring-blue-500/50' 
            : mapType !== 'roadmap' 
              ? 'border-blue-500 hover:bg-gray-700' 
              : 'border-gray-700 hover:bg-gray-700'}
        `}
        title={getMapTypeTitle()}
      >
        <Map size={24} className={`transition ${clickedButton === 'mapType' ? 'text-blue-400' : 'group-hover:text-blue-400 group-active:text-blue-300'}`} />
      </button>
    </div>
  );
});
