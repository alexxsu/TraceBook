import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, GraduationCap, ChevronRight, Check, MapPin, Filter, Menu, Layers, Search, Lock, Globe, UserPlus, Sparkles } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export type TutorialStep =
  | 'welcome'
  | 'map_overview'
  | 'search_bar'
  | 'search_bar_observe'
  | 'filter_button'
  | 'filter_observe'
  | 'side_menu'
  | 'side_menu_observe'
  | 'map_pill'
  | 'map_pill_observe'
  | 'map_management'
  | 'map_types'
  | 'map_controls'
  | 'add_button'
  | 'complete';

interface TutorialProps {
  isActive: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onOpenMapManagement?: () => void;
  onCloseMapManagement?: () => void;
  isGuestUser?: boolean;
}

interface StepConfig {
  id: TutorialStep;
  targetSelector?: string;
  requiresClick?: boolean;
  showOverlay?: boolean;
  autoAdvanceDelay?: number;
  revealHeader?: boolean;
  isRoundHighlight?: boolean; // For round buttons like add button
}

// Pre-generate firework data outside component to avoid hooks issues
const generateFireworks = () => {
  const colors = [
    'bg-yellow-400', 'bg-pink-400', 'bg-blue-400', 
    'bg-green-400', 'bg-purple-400', 'bg-orange-400',
    'bg-red-400', 'bg-cyan-400', 'bg-amber-400'
  ];
  
  const bursts: Array<{
    id: string;
    startX: number;
    startY: number;
    delay: number;
    color: string;
    size: number;
    endX: number;
    endY: number;
  }> = [];
  
  const burstPoints = [
    { x: 25, y: 20, delay: 0 },
    { x: 75, y: 25, delay: 0.2 },
    { x: 50, y: 15, delay: 0.4 },
    { x: 15, y: 40, delay: 0.6 },
    { x: 85, y: 35, delay: 0.8 },
    { x: 40, y: 55, delay: 1.0 },
    { x: 60, y: 50, delay: 1.2 },
    { x: 30, y: 70, delay: 1.4 },
    { x: 70, y: 65, delay: 1.6 },
  ];
  
  for (const burst of burstPoints) {
    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 80 + (i % 3) * 40;
      bursts.push({
        id: `${burst.x}-${burst.y}-${i}`,
        startX: burst.x,
        startY: burst.y,
        delay: burst.delay + (i % 4) * 0.05,
        color: colors[i % colors.length],
        size: 5 + (i % 3) * 3,
        endX: Math.cos(angle) * distance,
        endY: Math.sin(angle) * distance,
      });
    }
  }
  return bursts;
};

const FIREWORK_DATA = generateFireworks();

// Full-screen celebration overlay - rendered at root level
const CelebrationOverlay: React.FC<{ show: boolean; onFadeComplete: () => void }> = ({ show, onFadeComplete }) => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setFading(false);
      // Start fading after 2.5 seconds
      const fadeTimer = setTimeout(() => {
        setFading(true);
      }, 2500);
      // Complete hide after fade
      const hideTimer = setTimeout(() => {
        setVisible(false);
        onFadeComplete();
      }, 3500);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show, onFadeComplete]);

  if (!visible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[250] pointer-events-none transition-opacity duration-1000 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <style>{`
        @keyframes firework-particle {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--end-x), var(--end-y)) scale(0);
            opacity: 0;
          }
        }
        @keyframes firework-burst {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }
        @keyframes sparkle-float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
          50% { transform: translateY(-10px) rotate(180deg); opacity: 1; }
        }
      `}</style>
      
      {/* Firework particles */}
      {FIREWORK_DATA.map((particle) => (
        <div
          key={particle.id}
          className={`absolute rounded-full ${particle.color}`}
          style={{
            width: particle.size,
            height: particle.size,
            left: `${particle.startX}%`,
            top: `${particle.startY}%`,
            animation: `firework-particle 1.5s ease-out ${particle.delay}s forwards`,
            ['--end-x' as any]: `${particle.endX}px`,
            ['--end-y' as any]: `${particle.endY}px`,
          }}
        />
      ))}
      
      {/* Center burst effects */}
      {[
        { x: 25, y: 20, delay: 0, color: 'bg-yellow-300/40' },
        { x: 75, y: 25, delay: 0.2, color: 'bg-pink-300/40' },
        { x: 50, y: 15, delay: 0.4, color: 'bg-blue-300/40' },
        { x: 15, y: 40, delay: 0.6, color: 'bg-green-300/40' },
        { x: 85, y: 35, delay: 0.8, color: 'bg-purple-300/40' },
        { x: 40, y: 55, delay: 1.0, color: 'bg-orange-300/40' },
        { x: 60, y: 50, delay: 1.2, color: 'bg-cyan-300/40' },
      ].map((burst, i) => (
        <div
          key={`burst-${i}`}
          className={`absolute w-12 h-12 rounded-full ${burst.color}`}
          style={{
            left: `${burst.x}%`,
            top: `${burst.y}%`,
            animation: `firework-burst 0.8s ease-out ${burst.delay}s forwards`,
          }}
        />
      ))}
      
      {/* Floating sparkles */}
      {[...Array(30)].map((_, i) => (
        <Sparkles
          key={`sparkle-${i}`}
          size={12 + (i % 4) * 5}
          className={`absolute ${
            ['text-yellow-400', 'text-pink-400', 'text-blue-400', 'text-green-400', 'text-purple-400', 'text-orange-400'][i % 6]
          }`}
          style={{
            left: `${5 + (i * 3.2)}%`,
            top: `${10 + (i % 8) * 10}%`,
            animation: `sparkle-float 1.5s ease-in-out ${i * 0.08}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

// Checkmark animation overlay - rendered at root level
const CheckmarkOverlay: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[240] pointer-events-none flex items-center justify-center">
      <style>{`
        @keyframes checkmark-ring-ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes checkmark-ring-ping-delayed {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
      {/* Pulsing rings that expand outward */}
      <div 
        className="absolute w-28 h-28 rounded-full border-4 border-green-400/60"
        style={{ animation: 'checkmark-ring-ping 1.5s ease-out infinite' }}
      />
      <div 
        className="absolute w-28 h-28 rounded-full border-4 border-emerald-400/40"
        style={{ animation: 'checkmark-ring-ping-delayed 1.5s ease-out 0.3s infinite' }}
      />
    </div>
  );
};

export const Tutorial: React.FC<TutorialProps> = ({
  isActive,
  onClose,
  onComplete,
  onOpenMapManagement,
  onCloseMapManagement,
  isGuestUser = false
}) => {
  const { t, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [mapManagementReady, setMapManagementReady] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCheckmarkAnimation, setShowCheckmarkAnimation] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [isStepReady, setIsStepReady] = useState(true);
  const [celebrationFaded, setCelebrationFaded] = useState(false);
  
  const onCompleteRef = useRef(onComplete);
  const onOpenMapManagementRef = useRef(onOpenMapManagement);
  const onCloseMapManagementRef = useRef(onCloseMapManagement);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track initial state for smart reset
  const initialStateRef = useRef<{
    searchExpanded: boolean;
    filterExpanded: boolean;
    menuOpen: boolean;
    compactCardOpen: boolean;
  } | null>(null);

  // Capture initial state when tutorial starts
  useEffect(() => {
    if (isActive && !initialStateRef.current) {
      const searchBar = document.querySelector('[data-tutorial="search-bar"]');
      const filterButton = document.querySelector('[data-tutorial="filter-button"]');
      const sideMenu = document.querySelector('[data-component="side-menu"]');
      const compactCard = document.querySelector('[data-tutorial="map-pill"]');
      
      initialStateRef.current = {
        searchExpanded: searchBar?.getAttribute('data-expanded') === 'true',
        filterExpanded: filterButton?.getAttribute('data-expanded') === 'true',
        menuOpen: sideMenu?.getAttribute('data-open') === 'true',
        compactCardOpen: compactCard?.getAttribute('data-expanded') === 'true',
      };
    }
    if (!isActive) {
      initialStateRef.current = null;
    }
  }, [isActive]);

  // Step configurations - MUST be before any conditional returns
  const steps: StepConfig[] = useMemo(() => [
    { id: 'welcome', showOverlay: true },
    { id: 'map_overview', showOverlay: true },
    { id: 'search_bar', targetSelector: '[data-tutorial="search-bar"]', requiresClick: true, showOverlay: true },
    { id: 'search_bar_observe', showOverlay: false, autoAdvanceDelay: 2500 },
    { id: 'filter_button', targetSelector: '[data-tutorial="filter-button"]', requiresClick: true, showOverlay: true },
    { id: 'filter_observe', showOverlay: false, revealHeader: true, autoAdvanceDelay: 3000 },
    { id: 'side_menu', targetSelector: '[data-tutorial="menu-button"]', requiresClick: true, showOverlay: true },
    { id: 'side_menu_observe', showOverlay: false, autoAdvanceDelay: 3000 },
    { id: 'map_pill', targetSelector: '[data-tutorial="map-pill"]', requiresClick: true, showOverlay: true },
    { id: 'map_pill_observe', showOverlay: false, autoAdvanceDelay: 2500 },
    { id: 'map_management', showOverlay: false }, // Opens modal, then auto-advances to map_types
    { id: 'map_types', showOverlay: false },
    { id: 'map_controls', targetSelector: '[data-tutorial="map-controls"]', showOverlay: true },
    { id: 'add_button', targetSelector: '[data-tutorial="add-button"]', showOverlay: true, isRoundHighlight: true },
    { id: 'complete', showOverlay: true }
  ], []);

  const currentStepIndex = useMemo(() => steps.findIndex(s => s.id === currentStep), [steps, currentStep]);
  const currentConfig = useMemo(() => steps[currentStepIndex], [steps, currentStepIndex]);

  // ALL useCallback hooks MUST be defined before any conditional returns
  const clearAllTimers = useCallback(() => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
  }, []);

  const goToNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setContentVisible(false);
      setIsStepReady(false);
      
      // If leaving map_types, close the map management modal FIRST
      const currentStepId = steps[currentStepIndex].id;
      if (currentStepId === 'map_types') {
        onCloseMapManagementRef.current?.();
      }
      
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      
      transitionTimerRef.current = setTimeout(() => {
        setHighlightRect(null);
        const nextStep = steps[currentStepIndex + 1].id;
        setCurrentStep(nextStep);
        
        // If moving to map_management, open the map management modal NOW
        if (nextStep === 'map_management') {
          onOpenMapManagementRef.current?.();
        }
        
        setTimeout(() => {
          setContentVisible(true);
          setIsStepReady(true);
        }, 150);
      }, 250);
    }
  }, [currentStepIndex, steps]);

  const handleSkip = useCallback(() => {
    setContentVisible(false);
    onCloseMapManagementRef.current?.();
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 200);
    }, 250);
  }, [onClose]);

  const handleComplete = useCallback(() => {
    setContentVisible(false);
    localStorage.setItem('tutorial_completed', 'true');
    onCloseMapManagementRef.current?.();
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose();
        onCompleteRef.current?.();
      }, 200);
    }, 250);
  }, [onClose]);

  const handleHighlightClick = useCallback(() => {
    if (!currentConfig?.requiresClick) return;

    const targetSelector = currentConfig.targetSelector;
    if (targetSelector) {
      const element = document.querySelector(targetSelector) as HTMLElement;
      if (element) {
        element.click();
      }
    }

    setTimeout(goToNextStep, 350);
  }, [currentConfig, goToNextStep]);

  const getCardPosition = useCallback((): React.CSSProperties => {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const cardHeight = currentStep === 'map_types' ? 420 : 320;
    const cardWidth = Math.min(320, viewportWidth - 32);
    const padding = 24;

    if (!highlightRect || !isStepReady) {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)'
      };
    }

    const highlightCenterY = highlightRect.top + highlightRect.height / 2;
    const highlightCenterX = highlightRect.left + highlightRect.width / 2;
    const highlightBottom = highlightRect.top + highlightRect.height;

    let top: number;
    let left: number;

    if (highlightCenterY < viewportHeight / 2) {
      top = Math.min(highlightBottom + padding, viewportHeight - cardHeight - padding);
    } else {
      top = Math.max(highlightRect.top - cardHeight - padding, padding);
    }

    left = Math.max(padding, Math.min(highlightCenterX - cardWidth / 2, viewportWidth - cardWidth - padding));

    return { 
      top: `${top}px`, 
      left: `${left}px`, 
      transform: 'none'
    };
  }, [highlightRect, currentStep, isStepReady]);

  const getHighlightStyle = useCallback((): React.CSSProperties | null => {
    if (!highlightRect || !isStepReady) return null;

    const isRound = currentConfig?.isRoundHighlight;
    const padding = isRound ? 4 : 10; // Reduced padding for round buttons to keep highlight tight
    
    if (isRound) {
      // For round buttons, create a circular highlight just slightly larger than the button
      const size = Math.max(highlightRect.width, highlightRect.height) + padding * 2;
      const centerX = highlightRect.left + highlightRect.width / 2;
      const centerY = highlightRect.top + highlightRect.height / 2;
      return {
        top: centerY - size / 2,
        left: centerX - size / 2,
        width: size,
        height: size,
        borderRadius: '50%',
      };
    }
    
    return {
      top: highlightRect.top - padding,
      left: highlightRect.left - padding,
      width: highlightRect.width + padding * 2,
      height: highlightRect.height + padding * 2,
    };
  }, [highlightRect, isStepReady, currentConfig]);

  const getHeaderArea = useCallback((): React.CSSProperties | null => {
    const header = document.querySelector('[data-component="header-bar"]');
    if (header) {
      const rect = header.getBoundingClientRect();
      const padding = 12;
      return {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + 110,
      };
    }
    return null;
  }, []);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onOpenMapManagementRef.current = onOpenMapManagement;
    onCloseMapManagementRef.current = onCloseMapManagement;
  }, [onComplete, onOpenMapManagement, onCloseMapManagement]);

  // Cleanup on unmount
  useEffect(() => {
    return clearAllTimers;
  }, [clearAllTimers]);

  // Initialize/reset on activation
  useEffect(() => {
    if (isActive) {
      setCurrentStep('welcome');
      setMapManagementReady(false);
      setShowCelebration(false);
      setShowCheckmarkAnimation(false);
      setCelebrationFaded(false);
      setHighlightRect(null);
      setContentVisible(true);
      setIsStepReady(true);
      setTimeout(() => setIsVisible(true), 50);
    } else {
      clearAllTimers();
      setIsVisible(false);
      setCurrentStep('welcome');
      setMapManagementReady(false);
      setShowCelebration(false);
      setShowCheckmarkAnimation(false);
      setCelebrationFaded(false);
      setHighlightRect(null);
    }
  }, [isActive, clearAllTimers]);

  // Handle step-specific actions
  useEffect(() => {
    if (!isActive) return;

    if (currentStep === 'filter_button' || 
        currentStep === 'side_menu' || 
        currentStep === 'map_pill' ||
        currentStep === 'map_controls' ||
        currentStep === 'add_button') {
      onCloseMapManagementRef.current?.();
    }
  }, [isActive, currentStep]);

  // Handle map_management step - wait for modal to be ready, then auto-advance to map_types
  useEffect(() => {
    if (!isActive || currentStep !== 'map_management') return;
    
    // Wait for modal to appear, then auto-advance to map_types
    let attempts = 0;
    const checkModal = setInterval(() => {
      attempts++;
      const modal = document.querySelector('[data-modal="map-management"]');
      if (modal || attempts > 40) {
        clearInterval(checkModal);
        // After modal is ready, auto-advance to map_types step
        setTimeout(() => {
          goToNextStep();
        }, 500);
      }
    }, 100);
    
    return () => clearInterval(checkModal);
  }, [isActive, currentStep, goToNextStep]);

  // Handle map_types step - wait for modal to be ready
  useEffect(() => {
    if (!isActive || currentStep !== 'map_types') return;
    
    setMapManagementReady(false);
    
    // Wait for modal to appear
    let attempts = 0;
    const checkModal = setInterval(() => {
      attempts++;
      const modal = document.querySelector('[data-modal="map-management"]');
      if (modal || attempts > 40) {
        clearInterval(checkModal);
        setTimeout(() => setMapManagementReady(true), 400);
      }
    }, 100);
    
    return () => clearInterval(checkModal);
  }, [isActive, currentStep]);

  // Show celebration on complete
  useEffect(() => {
    if (currentStep === 'complete') {
      const timer = setTimeout(() => {
        setShowCelebration(true);
        setShowCheckmarkAnimation(true);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setShowCelebration(false);
      setShowCheckmarkAnimation(false);
      setCelebrationFaded(false);
    }
  }, [currentStep]);

  // Auto-advance for observation steps
  useEffect(() => {
    if (!isActive || !currentConfig?.autoAdvanceDelay) return;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    autoAdvanceTimerRef.current = setTimeout(() => {
      goToNextStep();
    }, currentConfig.autoAdvanceDelay);

    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, [isActive, currentStep, currentConfig, goToNextStep]);

  // Update highlight position when step changes
  useEffect(() => {
    if (!isActive) {
      setHighlightRect(null);
      return;
    }

    const targetSelector = currentConfig?.targetSelector;
    
    if (!targetSelector) {
      setHighlightRect(null);
      return;
    }

    setHighlightRect(null);

    const updateHighlight = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
      }
    };

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    
    highlightTimerRef.current = setTimeout(updateHighlight, 400);

    const interval = setInterval(updateHighlight, 500);
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);

    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      clearInterval(interval);
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [isActive, currentStep, currentConfig]);

  // Early return AFTER all hooks
  if (!isActive) return null;

  const isLoadingMapManagement = currentStep === 'map_types' && !mapManagementReady;
  const highlightStyle = getHighlightStyle();
  const cardPosition = getCardPosition();
  const showOverlay = currentConfig?.showOverlay !== false;
  const headerArea = currentConfig?.revealHeader ? getHeaderArea() : null;
  const isRoundHighlight = currentConfig?.isRoundHighlight;

  const renderStepContent = () => {
    if (isLoadingMapManagement) {
      return (
        <div className="text-center py-6">
          <div className="w-10 h-10 mx-auto mb-3 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">{language === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      );
    }

    switch (currentStep) {
      case 'welcome':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <GraduationCap size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{t('tutorialWelcome')}</h2>
            <p className="text-gray-300 mb-6 leading-relaxed text-sm">{t('tutorialWelcomeDesc')}</p>
            <button
              onClick={goToNextStep}
              className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 flex items-center gap-2 mx-auto"
            >
              {t('tutorialStart')}
              <ChevronRight size={18} />
            </button>
          </div>
        );

      case 'map_overview':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
              <MapPin size={26} className="text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialMapOverview')}</h3>
            <p className="text-gray-300 text-sm mb-5">{t('tutorialMapOverviewDesc')}</p>
            <button onClick={goToNextStep} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all">
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'search_bar':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Search size={26} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialSearchBar')}</h3>
            <p className="text-gray-300 text-sm mb-4">{t('tutorialSearchBarDesc')}</p>
            <p className="text-blue-400 text-sm animate-pulse">👆 {language === 'zh' ? '点击高亮区域' : 'Tap highlighted area'}</p>
          </div>
        );

      case 'search_bar_observe':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Search size={26} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialSearchBar')}</h3>
            <p className="text-gray-300 text-sm mb-3">{t('tutorialSearchBarTransform')}</p>
            <p className="text-green-400 text-sm">✓ {language === 'zh' ? '很好！' : 'Nice!'}</p>
          </div>
        );

      case 'filter_button':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Filter size={26} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialFilter')}</h3>
            <p className="text-gray-300 text-sm mb-4">{t('tutorialFilterDesc')}</p>
            <p className="text-purple-400 text-sm animate-pulse">👆 {language === 'zh' ? '点击高亮区域' : 'Tap highlighted area'}</p>
          </div>
        );

      case 'filter_observe':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Filter size={26} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialFilter')}</h3>
            <p className="text-gray-300 text-sm mb-3">{t('tutorialFilterObserve')}</p>
            <p className="text-green-400 text-sm">✓ {language === 'zh' ? '很好！' : 'Nice!'}</p>
          </div>
        );

      case 'side_menu':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Menu size={26} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialSideMenu')}</h3>
            <p className="text-gray-300 text-sm mb-4">{t('tutorialSideMenuDesc')}</p>
            <p className="text-orange-400 text-sm animate-pulse">👆 {language === 'zh' ? '点击高亮区域' : 'Tap highlighted area'}</p>
          </div>
        );

      case 'side_menu_observe':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-orange-500/20 rounded-full flex items-center justify-center">
              <Menu size={26} className="text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialSideMenu')}</h3>
            <p className="text-gray-300 text-sm mb-3">{language === 'zh' ? '这里可以访问所有功能！' : 'Access all features from here!'}</p>
            <p className="text-green-400 text-sm">✓ {language === 'zh' ? '很好！' : 'Nice!'}</p>
          </div>
        );

      case 'map_pill':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <Layers size={26} className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialMapPill')}</h3>
            <p className="text-gray-300 text-sm mb-4">{t('tutorialMapPillDesc')}</p>
            <p className="text-cyan-400 text-sm animate-pulse">👆 {language === 'zh' ? '点击高亮区域' : 'Tap highlighted area'}</p>
          </div>
        );

      case 'map_pill_observe':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <Layers size={26} className="text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialMapPill')}</h3>
            <p className="text-gray-300 text-sm mb-3">{language === 'zh' ? '查看和切换地图！' : 'View and switch maps!'}</p>
            <p className="text-green-400 text-sm">✓ {language === 'zh' ? '很好！' : 'Nice!'}</p>
          </div>
        );

      case 'map_management':
        return (
          <div className="text-center py-4">
            <div className="w-10 h-10 mx-auto mb-3 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-300 text-sm">{language === 'zh' ? '正在打开地图管理...' : 'Opening map management...'}</p>
          </div>
        );

      case 'map_types':
        return (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-4">{t('tutorialMapTypes')}</h3>
            <div className="space-y-2.5 mb-5 text-left">
              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-2.5">
                <div className="w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <Lock size={16} className="text-gray-300" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t('tutorialMapTypePrivate')}</p>
                  <p className="text-gray-400 text-xs">{t('tutorialMapTypePrivateDesc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                  <Globe size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t('tutorialMapTypeShared')}</p>
                  <p className="text-gray-400 text-xs">{t('tutorialMapTypeSharedDesc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-700/50 rounded-lg p-2.5">
                <div className="w-9 h-9 rounded-full bg-green-600/30 flex items-center justify-center flex-shrink-0">
                  <UserPlus size={16} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{t('tutorialMapTypeJoined')}</p>
                  <p className="text-gray-400 text-xs">{t('tutorialMapTypeJoinedDesc')}</p>
                </div>
              </div>
            </div>
            <button onClick={goToNextStep} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all">
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'map_controls':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-teal-500/20 rounded-full flex items-center justify-center">
              <MapPin size={26} className="text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialMapControls')}</h3>
            <p className="text-gray-300 text-sm mb-5">{t('tutorialMapControlsDesc')}</p>
            <button onClick={goToNextStep} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all">
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'add_button':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl text-red-400">+</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialAddButton')}</h3>
            <p className="text-gray-300 text-sm mb-5">{t('tutorialAddButtonDesc')}</p>
            <button onClick={goToNextStep} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all">
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
              <Check size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">{t('tutorialComplete')}</h2>
            <p className="text-gray-300 text-sm mb-4">{t('tutorialCompleteDesc')}</p>
            <div className="flex items-center gap-2 justify-center mb-5 text-amber-400/90 text-xs bg-amber-500/10 px-3 py-2 rounded-lg">
              <GraduationCap size={14} />
              <span>{t('tutorialFindInMenu')}</span>
            </div>
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-medium rounded-xl transition-all shadow-lg"
            >
              {t('tutorialFinish')}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderOverlay = () => {
    if (!showOverlay) return null;

    if (headerArea) {
      const top = headerArea.top as number;
      const left = headerArea.left as number;
      const width = headerArea.width as number;
      const height = headerArea.height as number;

      return (
        <>
          <div className="absolute left-0 right-0 top-0 bg-black/80 transition-opacity duration-300" 
            style={{ height: Math.max(0, top), pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
            onClick={(e) => e.stopPropagation()} />
          <div className="absolute left-0 right-0 bottom-0 bg-black/80 transition-opacity duration-300" 
            style={{ top: top + height, pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
            onClick={(e) => e.stopPropagation()} />
          <div className="absolute left-0 bg-black/80 transition-opacity duration-300" 
            style={{ top, width: Math.max(0, left), height, pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
            onClick={(e) => e.stopPropagation()} />
          <div className="absolute right-0 bg-black/80 transition-opacity duration-300" 
            style={{ top, left: left + width, height, pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
            onClick={(e) => e.stopPropagation()} />
        </>
      );
    }

    if (highlightStyle) {
      const top = highlightStyle.top as number;
      const left = highlightStyle.left as number;
      const width = highlightStyle.width as number;
      const height = highlightStyle.height as number;

      // For round highlights, we need to create a proper circular cutout
      if (isRoundHighlight) {
        const radius = width / 2;
        const centerX = left + radius;
        const centerY = top + radius;
        
        return (
          <>
            {/* Use clip-path for proper circular cutout */}
            <div 
              className="absolute inset-0 bg-black/80 transition-opacity duration-300"
              style={{ 
                pointerEvents: 'auto', 
                opacity: contentVisible ? 1 : 0,
                clipPath: `polygon(
                  0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                  ${centerX}px ${centerY - radius}px,
                  ${centerX + radius * Math.cos(-Math.PI/4)}px ${centerY + radius * Math.sin(-Math.PI/4)}px,
                  ${centerX + radius}px ${centerY}px,
                  ${centerX + radius * Math.cos(Math.PI/4)}px ${centerY + radius * Math.sin(Math.PI/4)}px,
                  ${centerX}px ${centerY + radius}px,
                  ${centerX + radius * Math.cos(3*Math.PI/4)}px ${centerY + radius * Math.sin(3*Math.PI/4)}px,
                  ${centerX - radius}px ${centerY}px,
                  ${centerX + radius * Math.cos(-3*Math.PI/4)}px ${centerY + radius * Math.sin(-3*Math.PI/4)}px,
                  ${centerX}px ${centerY - radius}px
                )`
              }} 
              onClick={(e) => e.stopPropagation()} 
            />
            {/* Clickable area for round button */}
            {currentConfig?.requiresClick && (
              <div
                className="absolute cursor-pointer"
                style={{ 
                  top, 
                  left, 
                  width, 
                  height, 
                  borderRadius: '50%', 
                  pointerEvents: 'auto' 
                }}
                onClick={handleHighlightClick}
              />
            )}
          </>
        );
      }

      return (
        <>
          <div className="absolute left-0 right-0 top-0 bg-black/80 transition-opacity duration-300" 
            style={{ height: Math.max(0, top), pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
            onClick={(e) => e.stopPropagation()} />
          <div className="absolute left-0 right-0 bottom-0 bg-black/80 transition-opacity duration-300" 
            style={{ top: top + height, pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
            onClick={(e) => e.stopPropagation()} />
          <div className="absolute left-0 bg-black/80 transition-opacity duration-300" 
            style={{ top, width: Math.max(0, left), height, pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
            onClick={(e) => e.stopPropagation()} />
          <div className="absolute right-0 bg-black/80 transition-opacity duration-300" 
            style={{ top, left: left + width, height, pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
            onClick={(e) => e.stopPropagation()} />
          
          {currentConfig?.requiresClick && (
            <div
              className="absolute cursor-pointer"
              style={{ top, left, width, height, borderRadius: 12, pointerEvents: 'auto' }}
              onClick={handleHighlightClick}
            />
          )}
        </>
      );
    }

    return (
      <div 
        className="absolute inset-0 bg-black/80 transition-opacity duration-300" 
        style={{ pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }} 
        onClick={(e) => e.stopPropagation()} 
      />
    );
  };

  // Calculate progress dots (excluding welcome and complete)
  const progressSteps = steps.slice(1, -1);
  const progressIndex = currentStepIndex - 1; // Adjust for excluded welcome step

  return (
    <>
      {/* Full-screen celebration overlay - outside main tutorial container */}
      <CelebrationOverlay 
        show={showCelebration && !celebrationFaded} 
        onFadeComplete={() => setCelebrationFaded(true)} 
      />
      
      {/* Checkmark animation overlay - outside main tutorial container */}
      <CheckmarkOverlay show={showCheckmarkAnimation && !celebrationFaded} />
      
      <div
        className={`fixed inset-0 z-[200] transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ pointerEvents: 'none' }}
      >
        {renderOverlay()}

        {highlightStyle && showOverlay && (
          <div
            className={`absolute border-2 border-blue-400 pointer-events-none transition-opacity duration-300 ${isRoundHighlight ? '' : 'rounded-xl'}`}
            style={{
              top: highlightStyle.top,
              left: highlightStyle.left,
              width: highlightStyle.width,
              height: highlightStyle.height,
              borderRadius: isRoundHighlight ? '50%' : undefined,
              opacity: contentVisible ? 1 : 0,
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.3)',
              animation: contentVisible ? 'pulse 2s ease-in-out infinite' : 'none'
            }}
          />
        )}

        {currentStep !== 'complete' && (
          <button
            onClick={handleSkip}
            className="absolute top-3 right-3 z-[201] flex items-center gap-1.5 px-2.5 py-1.5 text-gray-400 hover:text-white bg-gray-800/90 hover:bg-gray-700 rounded-lg transition-all duration-300"
            style={{ pointerEvents: 'auto', opacity: contentVisible ? 1 : 0 }}
          >
            <X size={14} />
            <span className="hidden sm:inline">{t('tutorialSkip')}</span>
          </button>
        )}

        {/* Progress dots - bottom center */}
        {currentStep !== 'welcome' && currentStep !== 'complete' && (
          <div 
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[201] flex items-center gap-1.5 transition-opacity duration-300" 
            style={{ pointerEvents: 'none', opacity: contentVisible ? 1 : 0 }}
          >
            {progressSteps.map((step, index) => (
              <div
                key={step.id}
                className={`rounded-full transition-all duration-500 ${
                  index < progressIndex ? 'bg-blue-500 w-2 h-2' :
                  index === progressIndex ? 'bg-blue-400 w-3 h-3' : 'bg-gray-600 w-2 h-2'
                }`}
              />
            ))}
          </div>
        )}

        <div
          className="absolute z-[201] w-80 max-w-[calc(100vw-24px)] bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-700 shadow-2xl p-5 transition-opacity duration-300"
          style={{ 
            ...cardPosition, 
            pointerEvents: 'auto',
            opacity: contentVisible ? 1 : 0
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderStepContent()}
        </div>
      </div>
    </>
  );
};

interface TutorialButtonProps {
  onClick: () => void;
  isGuestUser?: boolean;
  showPulse?: boolean;
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({ onClick, isGuestUser = false, showPulse = false }) => {
  const { t, language } = useLanguage();

  if (isGuestUser) {
    return (
      <div className="relative">
        <div className="absolute -inset-3 rounded-full bg-amber-500/25 animate-ping" />
        <div className="absolute -inset-1.5 rounded-full bg-amber-500/15 animate-pulse" />
        <button
          onClick={onClick}
          className="relative w-16 h-16 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 hover:from-amber-300 hover:via-orange-400 hover:to-red-400 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 group animate-bounce border-2 border-white/40"
          title={t('tutorialButton')}
          style={{ boxShadow: '0 0 40px rgba(251, 191, 36, 0.6), 0 12px 50px rgba(251, 146, 60, 0.5)' }}
        >
          <GraduationCap size={32} className="drop-shadow-lg" />
        </button>
        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-800/95 backdrop-blur text-white text-sm px-4 py-2.5 rounded-xl shadow-xl animate-pulse border border-gray-600">
          <span className="font-medium">{language === 'zh' ? '👋 点击开始教程！' : '👋 Start tutorial!'}</span>
          <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 border-r-[10px] border-r-gray-800 border-y-[10px] border-y-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {showPulse && <div className="absolute inset-0 rounded-full bg-amber-500/40 animate-ping" />}
      <button
        onClick={onClick}
        className="relative w-11 h-11 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-xl group"
        title={t('tutorialButton')}
      >
        <GraduationCap size={22} className="group-hover:animate-bounce" />
      </button>
    </div>
  );
};
