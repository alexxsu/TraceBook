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
  | 'manage_maps_button'
  | 'map_management_modal'
  | 'close_menu_transition'
  | 'map_pill'
  | 'map_pill_observe'
  | 'map_controls'
  | 'add_button'
  | 'complete';

interface TutorialProps {
  isActive: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onOpenMapManagement?: () => void;
  onCloseMapManagement?: () => void;
  onCloseSideMenu?: () => void;
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
// Full-screen celebration overlay - rendered at root level
const CelebrationOverlay: React.FC<{ show: boolean; onFadeComplete: () => void }> = ({ show, onFadeComplete }) => {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      setFading(false);
      // Start fading after 3 seconds
      const fadeTimer = setTimeout(() => {
        setFading(true);
      }, 3000);
      // Complete hide after fade
      const hideTimer = setTimeout(() => {
        setVisible(false);
        onFadeComplete();
      }, 4000);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show, onFadeComplete]);

  if (!visible) return null;

  // Generate many stars that burst from center upward
  const stars: Array<{
    id: number;
    angle: number;
    distance: number;
    size: number;
    delay: number;
    duration: number;
    color: string;
  }> = [];
  
  const colors = [
    'text-yellow-400', 'text-amber-400', 'text-orange-400',
    'text-pink-400', 'text-rose-400', 'text-red-400',
    'text-purple-400', 'text-violet-400', 'text-indigo-400',
    'text-blue-400', 'text-cyan-400', 'text-teal-400',
    'text-green-400', 'text-emerald-400', 'text-lime-400',
  ];

  // Create 60 stars bursting outward, mostly upward
  for (let i = 0; i < 60; i++) {
    // Bias angle upward (-120° to -60° is straight up area, with some spread to sides)
    const baseAngle = -90; // straight up
    const angleVariation = (Math.random() - 0.5) * 180; // -90 to +90 variation
    const angle = baseAngle + angleVariation;
    
    stars.push({
      id: i,
      angle: angle,
      distance: 150 + Math.random() * 300, // 150-450px
      size: 10 + Math.random() * 16, // 10-26px
      delay: Math.random() * 0.5, // 0-0.5s stagger
      duration: 1.5 + Math.random() * 1, // 1.5-2.5s
      color: colors[i % colors.length],
    });
  }

  return (
    <div 
      className={`fixed inset-0 z-[250] pointer-events-none transition-opacity duration-1000 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <style>{`
        @keyframes star-burst {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            transform: translate(-50%, -50%) scale(1) rotate(20deg);
            opacity: 1;
          }
          70% {
            opacity: 0.9;
          }
          100% {
            transform: translate(
              calc(-50% + var(--end-x)), 
              calc(-50% + var(--end-y))
            ) scale(0.3) rotate(180deg);
            opacity: 0;
          }
        }
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes center-glow {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
          30% { transform: translate(-50%, -50%) scale(2); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `}</style>
      
      {/* Central glow burst */}
      <div
        className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-yellow-400/60 via-orange-400/60 to-pink-400/60"
        style={{
          left: '50%',
          top: '45%',
          animation: 'center-glow 1s ease-out forwards',
          filter: 'blur(20px)',
        }}
      />
      
      {/* Bursting stars */}
      {stars.map((star) => {
        const endX = Math.cos((star.angle * Math.PI) / 180) * star.distance;
        const endY = Math.sin((star.angle * Math.PI) / 180) * star.distance;
        
        return (
          <div
            key={star.id}
            className={`absolute ${star.color}`}
            style={{
              left: '50%',
              top: '45%',
              animation: `star-burst ${star.duration}s ease-out ${star.delay}s forwards`,
              ['--end-x' as any]: `${endX}px`,
              ['--end-y' as any]: `${endY}px`,
            }}
          >
            <Sparkles size={star.size} style={{ filter: 'drop-shadow(0 0 4px currentColor)' }} />
          </div>
        );
      })}
      
      {/* Additional twinkling stars scattered around */}
      {[...Array(25)].map((_, i) => (
        <Sparkles
          key={`twinkle-${i}`}
          size={8 + (i % 4) * 4}
          className={`absolute ${colors[i % colors.length]}`}
          style={{
            left: `${10 + (i * 3.5)}%`,
            top: `${5 + (i % 6) * 15}%`,
            animation: `sparkle-twinkle ${0.8 + (i % 3) * 0.3}s ease-in-out ${i * 0.1}s infinite`,
            filter: 'drop-shadow(0 0 3px currentColor)',
          }}
        />
      ))}
    </div>
  );
};

// Checkmark animation overlay - centered on screen where card appears
const CheckmarkOverlay: React.FC<{ show: boolean }> = ({ show }) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  
  useEffect(() => {
    if (!show) {
      setPosition(null);
      return;
    }
    
    // Find the checkmark element by looking for the green gradient circle in complete step
    const findCheckmark = () => {
      const checkmarkContainer = document.querySelector('[data-tutorial-checkmark]');
      if (checkmarkContainer) {
        const rect = checkmarkContainer.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        });
      }
    };
    
    // Try immediately and also after a short delay for animation
    findCheckmark();
    const timer = setTimeout(findCheckmark, 100);
    const timer2 = setTimeout(findCheckmark, 300);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [show]);
  
  if (!show || !position) return null;
  
  return (
    <div className="fixed inset-0 z-[240] pointer-events-none">
      <style>{`
        @keyframes checkmark-ring-expand-1 {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        @keyframes checkmark-ring-expand-2 {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
        }
        @keyframes checkmark-ring-expand-3 {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
        @keyframes checkmark-glow-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
        }
      `}</style>
      
      {/* Glowing center */}
      <div 
        className="absolute w-24 h-24 rounded-full bg-green-500/40"
        style={{ 
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          animation: 'checkmark-glow-pulse 1s ease-in-out infinite',
          boxShadow: '0 0 40px rgba(34, 197, 94, 0.6), 0 0 80px rgba(34, 197, 94, 0.3)',
        }}
      />
      
      {/* Expanding rings */}
      <div 
        className="absolute w-20 h-20 rounded-full border-4 border-green-400"
        style={{ 
          left: position.x,
          top: position.y,
          animation: 'checkmark-ring-expand-1 1.5s ease-out infinite' 
        }}
      />
      <div 
        className="absolute w-20 h-20 rounded-full border-4 border-emerald-400"
        style={{ 
          left: position.x,
          top: position.y,
          animation: 'checkmark-ring-expand-2 1.5s ease-out 0.25s infinite' 
        }}
      />
      <div 
        className="absolute w-20 h-20 rounded-full border-4 border-green-300"
        style={{ 
          left: position.x,
          top: position.y,
          animation: 'checkmark-ring-expand-3 1.5s ease-out 0.5s infinite' 
        }}
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
  onCloseSideMenu,
  isGuestUser = false
}) => {
  const { t, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState<TutorialStep>('welcome');
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCheckmarkAnimation, setShowCheckmarkAnimation] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const [isStepReady, setIsStepReady] = useState(true);
  const [celebrationFaded, setCelebrationFaded] = useState(false);
  
  const onCompleteRef = useRef(onComplete);
  const onOpenMapManagementRef = useRef(onOpenMapManagement);
  const onCloseMapManagementRef = useRef(onCloseMapManagement);
  const onCloseSideMenuRef = useRef(onCloseSideMenu);
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
    { id: 'manage_maps_button', targetSelector: '[data-tutorial="side-menu-manage-maps"]', requiresClick: true, showOverlay: true },
    { id: 'map_management_modal', showOverlay: true },
    { id: 'close_menu_transition', showOverlay: false, autoAdvanceDelay: 800 },
    { id: 'map_pill', targetSelector: '[data-tutorial="map-pill"]', requiresClick: true, showOverlay: true },
    { id: 'map_pill_observe', showOverlay: false, autoAdvanceDelay: 2500 },
    { id: 'map_controls', targetSelector: '[data-tutorial="map-controls"]', showOverlay: true },
    { id: 'add_button', targetSelector: '[data-tutorial="add-button"]', showOverlay: true, isRoundHighlight: false },
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
      
      const currentStepId = steps[currentStepIndex].id;
      const nextStepId = steps[currentStepIndex + 1].id;
      
      // Open map management modal when moving to map_management_modal step
      // Show content immediately so user sees the explanation as modal opens
      if (nextStepId === 'map_management_modal') {
        onOpenMapManagementRef.current?.();
        // For map management, show content immediately (no fade out delay)
        setHighlightRect(null);
        setCurrentStep('map_management_modal');
        // Small delay to sync with modal animation
        setTimeout(() => {
          setContentVisible(true);
          setIsStepReady(true);
        }, 100);
        return;
      }
      
      // Close map management modal and side menu when leaving map_management_modal
      if (currentStepId === 'map_management_modal') {
        onCloseMapManagementRef.current?.();
        onCloseSideMenuRef.current?.();
      }
      
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      
      transitionTimerRef.current = setTimeout(() => {
        setHighlightRect(null);
        const nextStep = steps[currentStepIndex + 1].id;
        setCurrentStep(nextStep);
        
        setTimeout(() => {
          setContentVisible(true);
          setIsStepReady(true);
        }, 150);
      }, 250);
    }
  }, [currentStepIndex, steps]);

  const handleSkip = useCallback(() => {
    setContentVisible(false);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 200);
    }, 250);
  }, [onClose]);

  const handleComplete = useCallback(() => {
    setContentVisible(false);
    localStorage.setItem('tutorial_completed', 'true');
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

    const currentStepId = currentConfig.id;
    const targetSelector = currentConfig.targetSelector;
    
    // For manage_maps_button, just advance (modal opens via goToNextStep)
    if (currentStepId === 'manage_maps_button') {
      setTimeout(goToNextStep, 300);
      return;
    }
    
    if (targetSelector) {
      const element = document.querySelector(targetSelector) as HTMLElement;
      if (element) {
        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        const mouseUpEvent = new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        
        element.dispatchEvent(mouseDownEvent);
        element.dispatchEvent(mouseUpEvent);
        element.dispatchEvent(clickEvent);
      }
    }

    setTimeout(goToNextStep, 350);
  }, [currentConfig, goToNextStep]);

  const getCardPosition = useCallback((): React.CSSProperties => {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const cardHeight = currentStep === 'map_management' ? 380 : 320;
    const cardWidth = Math.min(320, viewportWidth - 32);
    const padding = 24;

    // For steps without targets, center the card
    const targetSelector = currentConfig?.targetSelector;
    if (!targetSelector) {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)'
      };
    }

    // Calculate position directly from target element to avoid jumping
    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) {
      return { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)'
      };
    }

    const rect = targetElement.getBoundingClientRect();
    const isRound = currentConfig?.isRoundHighlight;
    const highlightPadding = isRound ? 4 : 10;
    
    const highlightCenterY = rect.top + rect.height / 2;
    const highlightCenterX = rect.left + rect.width / 2;
    const highlightBottom = rect.top + rect.height + highlightPadding;

    let top: number;
    let left: number;

    if (highlightCenterY < viewportHeight / 2) {
      top = Math.min(highlightBottom + padding, viewportHeight - cardHeight - padding);
    } else {
      top = Math.max(rect.top - highlightPadding - cardHeight - padding, padding);
    }

    left = Math.max(padding, Math.min(highlightCenterX - cardWidth / 2, viewportWidth - cardWidth - padding));

    return { 
      top: `${top}px`, 
      left: `${left}px`, 
      transform: 'none'
    };
  }, [currentStep, currentConfig]);

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
    onCloseSideMenuRef.current = onCloseSideMenu;
  }, [onComplete, onOpenMapManagement, onCloseMapManagement, onCloseSideMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return clearAllTimers;
  }, [clearAllTimers]);

  // Initialize/reset on activation
  useEffect(() => {
    if (isActive) {
      setCurrentStep('welcome');
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

    // Clear highlight immediately when step changes
    setHighlightRect(null);

    let lastRect: DOMRect | null = null;
    let stableCount = 0;
    let hasShownHighlight = false;
    
    const updateHighlight = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Check if element is visible (has dimensions and is on screen)
        if (rect.width > 0 && rect.height > 0 && rect.top >= -10 && rect.left >= -10) {
          // Check if position is stable (same as last check)
          if (lastRect && 
              Math.abs(rect.top - lastRect.top) < 3 && 
              Math.abs(rect.left - lastRect.left) < 3 &&
              Math.abs(rect.width - lastRect.width) < 3 &&
              Math.abs(rect.height - lastRect.height) < 3) {
            stableCount++;
            // Only show highlight after position is stable for 3 consecutive checks
            if (stableCount >= 3 && !hasShownHighlight) {
              hasShownHighlight = true;
              setHighlightRect(rect);
            } else if (hasShownHighlight) {
              // Update position if already shown
              setHighlightRect(rect);
            }
          } else {
            stableCount = 0;
            // Reset if position changed significantly after showing
            if (hasShownHighlight && lastRect && (
              Math.abs(rect.top - lastRect.top) > 20 ||
              Math.abs(rect.left - lastRect.left) > 20)) {
              hasShownHighlight = false;
              setHighlightRect(null);
            }
          }
          lastRect = rect;
        }
      }
    };

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    
    // Wait longer before starting to check - let animations complete
    highlightTimerRef.current = setTimeout(() => {
      updateHighlight();
    }, 500);

    // Check at regular intervals
    const interval = setInterval(updateHighlight, 150);
    
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

  const highlightStyle = getHighlightStyle();
  const cardPosition = getCardPosition();
  const showOverlay = currentConfig?.showOverlay !== false;
  const headerArea = currentConfig?.revealHeader ? getHeaderArea() : null;
  const isRoundHighlight = currentConfig?.isRoundHighlight;

  const renderStepContent = () => {
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

      case 'manage_maps_button':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <Layers size={26} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialMapManagement')}</h3>
            <p className="text-gray-300 text-sm mb-4">{language === 'zh' ? '点击这里管理您的地图' : 'Tap here to manage your maps'}</p>
            <p className="text-indigo-400 text-sm animate-pulse">👆 {language === 'zh' ? '点击高亮区域' : 'Tap highlighted area'}</p>
          </div>
        );

      case 'map_management_modal':
        return (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-indigo-500/20 rounded-full flex items-center justify-center">
              <Layers size={26} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-3">{t('tutorialMapManagement')}</h3>
            <p className="text-gray-300 text-sm mb-3">
              {language === 'zh' 
                ? '在地图管理中您可以：' 
                : 'In Map Management you can:'}
            </p>
            <div className="text-left space-y-2 mb-4 text-sm">
              <p className="text-gray-300 flex items-center gap-2">
                <span className="text-indigo-400">•</span> 
                {language === 'zh' ? '切换不同地图' : 'Switch between maps'}
              </p>
              <p className="text-gray-300 flex items-center gap-2">
                <span className="text-indigo-400">•</span> 
                {language === 'zh' ? '创建新地图' : 'Create new maps'}
              </p>
              <p className="text-gray-300 flex items-center gap-2">
                <span className="text-indigo-400">•</span> 
                {language === 'zh' ? '加入他人的地图' : 'Join other people\'s maps'}
              </p>
            </div>
            <button
              onClick={goToNextStep}
              className="mt-2 px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-medium rounded-xl transition-colors duration-200"
            >
              {language === 'zh' ? '下一步' : 'Next'}
            </button>
          </div>
        );

      case 'close_menu_transition':
        return null;

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
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 via-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl text-white">+</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t('tutorialAddButton')}</h3>
            <p className="text-gray-300 text-sm mb-3">{t('tutorialAddButtonDesc')}</p>
            <p className="text-gray-400 text-xs mb-5">
              {language === 'zh' 
                ? '导航栏还可以让您访问好友和动态功能'
                : 'The navigation bar also gives you access to Friends and Feeds'}
            </p>
            <button onClick={goToNextStep} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all">
              {t('tutorialNext')}
            </button>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            <div 
              data-tutorial-checkmark
              className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg"
            >
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
        className={`absolute inset-0 transition-opacity duration-300 ${currentStep === 'map_management' ? 'bg-black/50' : 'bg-black/80'}`}
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
      {/* Highlight box animation styles */}
      <style>{`
        @keyframes highlight-appear {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes highlight-disappear {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.9);
          }
        }
        @keyframes highlight-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(96, 165, 250, 0.5), 0 0 20px rgba(96, 165, 250, 0.3);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(96, 165, 250, 0), 0 0 30px rgba(96, 165, 250, 0.5);
          }
        }
        .highlight-box-enter {
          animation: highlight-appear 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     highlight-pulse 2s ease-in-out 0.4s infinite;
        }
        .highlight-box-exit {
          animation: highlight-disappear 0.3s ease-out forwards;
        }
      `}</style>

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
            className={`absolute border-2 border-blue-400 pointer-events-none ${isRoundHighlight ? '' : 'rounded-xl'} ${
              contentVisible ? 'highlight-box-enter' : 'highlight-box-exit'
            }`}
            style={{
              top: highlightStyle.top,
              left: highlightStyle.left,
              width: highlightStyle.width,
              height: highlightStyle.height,
              borderRadius: isRoundHighlight ? '50%' : undefined,
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

        {/* Tutorial card - only render when there's content */}
        {renderStepContent() !== null && (
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
        )}
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
