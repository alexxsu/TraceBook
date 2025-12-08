import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Users, Rss, MapPin } from 'lucide-react';

export type NavigationPage = 'map' | 'friends' | 'feeds';

interface NavigationIslandProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  onAddPress: () => void;
  isAddModalOpen: boolean;
  hideNavigation: boolean;
  isModalActive?: boolean;
}

export const NavigationIsland: React.FC<NavigationIslandProps> = React.memo(({
  currentPage,
  onNavigate,
  onAddPress,
  isAddModalOpen,
  hideNavigation,
  isModalActive = false
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [animatingTo, setAnimatingTo] = useState<NavigationPage | null>(null);
  
  const shouldBeVisible = !hideNavigation && !isModalActive;
  
  useEffect(() => {
    if (shouldBeVisible) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      setIsAnimatingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [shouldBeVisible, shouldRender]);

  const handleNavigate = useCallback((page: NavigationPage) => {
    if (page === currentPage || animatingTo) return;
    setAnimatingTo(page);
    // Reduced delay for faster response
    setTimeout(() => {
      onNavigate(page);
      setAnimatingTo(null);
    }, 100);
  }, [currentPage, animatingTo, onNavigate]);

  const handleCenterPress = useCallback(() => {
    if (currentPage === 'map') {
      onAddPress();
    } else {
      handleNavigate('map');
    }
  }, [currentPage, onAddPress, handleNavigate]);

  // Memoize container style to prevent recalculation
  const containerStyle = useMemo(() => ({
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
    willChange: 'transform' as const,
  }), []);

  if (!shouldRender) return null;

  const isOnMap = currentPage === 'map';

  return (
    <div 
      className={`fixed bottom-8 inset-x-0 flex justify-center z-[60] pointer-events-none ${
        isAnimatingOut ? 'animate-fade-out-down' : 'animate-fade-in-up'
      }`}
    >
      {/* Navigation Island Container - slimmer and longer */}
      <div 
        className="pointer-events-auto flex items-center gap-4 px-4 py-1.5 bg-gray-900/80 backdrop-blur-xl border border-white/20 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        style={containerStyle}
      >
        {/* Friends Button */}
        <button
          onClick={() => handleNavigate('friends')}
          className={`relative flex items-center justify-center rounded-full transition-all duration-300 ease-out ${
            currentPage === 'friends'
              ? 'w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30'
              : 'w-10 h-10 bg-gray-800/80 hover:bg-gray-700/80'
          } ${animatingTo === 'friends' ? 'scale-110' : ''}`}
        >
          <Users 
            size={currentPage === 'friends' ? 22 : 20} 
            className={`transition-all duration-300 ${
              currentPage === 'friends' ? 'text-white' : 'text-gray-400'
            }`}
          />
          {currentPage === 'friends' && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
          )}
        </button>

        {/* Center Button - Plus or Map */}
        <button
          data-tutorial="add-button"
          onClick={handleCenterPress}
          className={`relative flex items-center justify-center rounded-full transition-all duration-300 ease-out active:scale-95 ${
            isOnMap
              ? isAddModalOpen
                ? 'w-14 h-14 bg-red-500/80 border border-red-400/50 shadow-red-500/20'
                : 'w-14 h-14 bg-gray-900/70 border border-white/30 hover:bg-gray-900/80 hover:shadow-blue-500/20 hover:scale-105'
              : currentPage === 'map' || animatingTo === 'map'
                ? 'w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30'
                : 'w-10 h-10 bg-gray-800/80 hover:bg-gray-700/80'
          }`}
        >
          {/* Gradient glow for map page add button */}
          {isOnMap && !isAddModalOpen && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400/30 via-red-400/20 to-blue-500/30 blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
          )}
          
          {/* Icon */}
          <div className={`relative z-10 transition-transform duration-300 ease-out ${
            isAddModalOpen ? 'rotate-[135deg]' : 'rotate-0'
          }`}>
            {isOnMap ? (
              <Plus 
                size={26} 
                className="text-white" 
                strokeWidth={2.5} 
              />
            ) : (
              <MapPin 
                size={currentPage === 'map' ? 22 : 20} 
                className={currentPage === 'map' ? 'text-white' : 'text-gray-400'}
              />
            )}
          </div>
          
          {/* Active indicator glow */}
          {!isOnMap && currentPage === 'map' && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
          )}
        </button>

        {/* Feeds Button */}
        <button
          onClick={() => handleNavigate('feeds')}
          className={`relative flex items-center justify-center rounded-full transition-all duration-300 ease-out ${
            currentPage === 'feeds'
              ? 'w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 shadow-lg shadow-orange-500/30'
              : 'w-10 h-10 bg-gray-800/80 hover:bg-gray-700/80'
          } ${animatingTo === 'feeds' ? 'scale-110' : ''}`}
        >
          <Rss 
            size={currentPage === 'feeds' ? 22 : 20} 
            className={`transition-all duration-300 ${
              currentPage === 'feeds' ? 'text-white' : 'text-gray-400'
            }`}
          />
          {currentPage === 'feeds' && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
          )}
        </button>
      </div>
    </div>
  );
});

NavigationIsland.displayName = 'NavigationIsland';

export default NavigationIsland;
