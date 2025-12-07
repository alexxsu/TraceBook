
import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, MapPin, Share2, User, Trash2, Pencil, Loader2, ExternalLink, Languages } from 'lucide-react';
import { Place, Visit, GUEST_ID } from '../types';
import { getGradeColor, calculateAverageGrade } from '../utils/rating';
import html2canvas from 'html2canvas';
import ImageSlider from './ImageSlider';
import { useLanguage, translateText } from '../hooks/useLanguage';
import {
  SWIPE_UP_THRESHOLD,
  SWIPE_DOWN_THRESHOLD,
  MODAL_TRANSITION_DURATION,
  DRAG_RESET_DELAY,
  CLOSE_ANIMATION_DURATION,
  MOBILE_BREAKPOINT
} from '../constants';

interface PlaceDetailProps {
  place: Place;
  currentUserUid?: string;
  onClose: () => void;
  onAddAnotherVisit: () => void;
  onDeleteVisit: (place: Place, visit: Visit) => void;
  onEditVisit: (place: Place, visit: Visit) => void;
  newlyAddedVisitId?: string | null; // For highlighting newly added visits
}

const PlaceDetail: React.FC<PlaceDetailProps> = ({
  place,
  currentUserUid,
  onClose,
  onAddAnotherVisit,
  onDeleteVisit,
  onEditVisit,
  newlyAddedVisitId
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'timeline' | 'info'>('timeline');
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [shareBase64Map, setShareBase64Map] = useState<Record<string, string>>({});
  const shareRef = useRef<HTMLDivElement>(null);

  // Translation state for comments
  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const [translatingComments, setTranslatingComments] = useState<Record<string, boolean>>({});
  const [showTranslated, setShowTranslated] = useState<Record<string, boolean>>({});

  // Animation & Drag State
  const [isClosing, setIsClosing] = useState(false);
  const [isClosingDown, setIsClosingDown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const startYRef = useRef<number>(0);

  // Delete animation state
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);

  const sortedVisits = [...place.visits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Handle comment translation
  const handleTranslateComment = async (visitId: string, comment: string) => {
    if (translatedComments[visitId]) {
      // Toggle between original and translated
      setShowTranslated(prev => ({ ...prev, [visitId]: !prev[visitId] }));
      return;
    }

    setTranslatingComments(prev => ({ ...prev, [visitId]: true }));
    try {
      const targetLang = language === 'en' ? 'zh' : 'en';
      const translated = await translateText(comment, targetLang);
      setTranslatedComments(prev => ({ ...prev, [visitId]: translated }));
      setShowTranslated(prev => ({ ...prev, [visitId]: true }));
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslatingComments(prev => ({ ...prev, [visitId]: false }));
    }
  };

  const handleClose = (direction: 'right' | 'down' = 'right') => {
    if (direction === 'down') setIsClosingDown(true);
    setIsClosing(true);
    setTimeout(onClose, CLOSE_ANIMATION_DURATION);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Drag Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (e.cancelable) {
      e.preventDefault();
    }

    if (!isExpanded && diff < 0) {
      setDragY(diff);
    } else if (diff > 0) {
      setDragY(diff);
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);

    const vibrate = (duration: number = 10) => {
      if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
    };

    if (!isExpanded && dragY < SWIPE_UP_THRESHOLD) {
      vibrate(15);
      setDragY(0);
      setTimeout(() => {
        setIsExpanding(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsExpanded(true);
            setTimeout(() => {
              setIsExpanding(false);
            }, MODAL_TRANSITION_DURATION);
          });
        });
      }, DRAG_RESET_DELAY);
    }
    else if (isExpanded && dragY > SWIPE_DOWN_THRESHOLD) {
      vibrate(15);
      setDragY(0);
      setIsExpanded(false);
      setTimeout(() => {
        setIsExpanding(false);
      }, MODAL_TRANSITION_DURATION);
    }
    else if (!isExpanded && dragY > SWIPE_DOWN_THRESHOLD) {
      vibrate(20);
      setTimeout(() => handleClose('down'), 100);
    }
    else {
      setDragY(0);
    }
  };

  const convertUrlToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
    });
  };

  const handleShareAsImage = async () => {
    if (!shareRef.current) return;
    setIsGeneratingShare(true);

    try {
      const photosToConvert: string[] = [];
      sortedVisits.slice(0, 2).forEach(v => {
        if (v.photoDataUrl && !shareBase64Map[v.photoDataUrl]) {
          photosToConvert.push(v.photoDataUrl);
        }
      });

      if (photosToConvert.length > 0) {
        const newBase64Map = { ...shareBase64Map };
        await Promise.all(
          photosToConvert.map(async url => {
            try {
              newBase64Map[url] = await convertUrlToBase64(url);
            } catch {
              newBase64Map[url] = url;
            }
          })
        );
        setShareBase64Map(newBase64Map);
        await new Promise(r => setTimeout(r, 300));
      }

      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
        scale: 2,
        logging: false,
        imageTimeout: 5000
      });

      if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], `${place.name}_Experience.png`, { type: 'image/png' });
          try {
            await navigator.share({
              files: [file],
              title: `${place.name} - TraceBook`,
              text: `Check out my experience at ${place.name}!`
            });
          } catch {
            downloadImage(canvas);
          }
        }, 'image/png');
      } else {
        downloadImage(canvas);
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('Could not generate share image. Please try again.');
    } finally {
      setIsGeneratingShare(false);
    }
  };

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `${place.name.replace(/\s+/g, '_')}_Experience.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Delete with animation
  const handleDelete = (visit: Visit) => {
    if (window.confirm(t('confirmDeleteExperience'))) {
      setDeletingVisitId(visit.id);
      // Wait for animation to complete before actually deleting
      setTimeout(() => {
        onDeleteVisit(place, visit);
        setDeletingVisitId(null);
      }, 400);
    }
  };

  const canEditOrDeleteVisit = (visit: Visit): boolean => {
    if (!currentUserUid) return false;
    if (currentUserUid === GUEST_ID) return false;
    if (visit.createdBy === currentUserUid) return true;
    const isRealUser = currentUserUid !== GUEST_ID;
    const isGuestPost = visit.createdBy === GUEST_ID;
    if (isRealUser && isGuestPost) return true;
    return false;
  };

  const avgGrade = calculateAverageGrade(place.visits);

  const handleOpenGoogleMaps = () => {
    const query = encodeURIComponent(`${place.name} ${place.address}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
  };

  let animationClass = 'animate-float-card-in sm:animate-slide-in-right';
  if (isClosing) {
    animationClass = isClosingDown ? 'animate-float-card-out' : 'animate-float-card-out sm:animate-slide-out-right';
  }

  const getCardHeight = () => {
    if (window.innerWidth >= MOBILE_BREAKPOINT) return '100%';
    if (isExpanding || isExpanded) return 'calc(100% - 20px)';
    return '80%';
  };

  const getDragTransform = () => {
    if (!isDragging) return 'translateY(0)';
    return `translateY(${dragY}px)`;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-10 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={() => handleClose('down')}
      />

      {/* Floating Card Container */}
      <div
        className={`
          fixed z-20
          sm:h-full sm:top-0 sm:left-auto sm:right-0 sm:w-[400px] sm:rounded-none
          ${animationClass}
        `}
        style={{
          left: window.innerWidth < MOBILE_BREAKPOINT ? '8px' : 'auto',
          right: window.innerWidth < MOBILE_BREAKPOINT ? '8px' : 0,
          bottom: window.innerWidth < MOBILE_BREAKPOINT ? '8px' : 'auto',
          top: window.innerWidth < MOBILE_BREAKPOINT ? 'auto' : 0,
          height: getCardHeight(),
          transform: getDragTransform(),
          transition: isDragging ? 'none' : `height ${MODAL_TRANSITION_DURATION}ms ease-out, transform 200ms ease-out`,
        }}
      >
        <div className="bg-gray-900 h-full flex flex-col rounded-3xl sm:rounded-none overflow-hidden border border-gray-700/50 sm:border-0 shadow-2xl">
          
          {/* Mobile drag handle */}
          <div
            className="sm:hidden py-3 cursor-grab active:cursor-grabbing"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto" />
          </div>

          {/* Header with place info */}
          <div className="px-4 pt-1 sm:pt-4 pb-3 border-b border-gray-700/50">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">{place.name}</h2>
                <p className="text-sm text-gray-400 truncate mt-0.5">{place.address}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl ${getGradeColor(avgGrade)} bg-gray-800 border border-gray-700`}>
                  {avgGrade}
                </div>
                <button
                  onClick={() => handleClose()}
                  className="hidden sm:flex p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 bg-gray-800/50 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                  activeTab === 'timeline' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {language === 'zh' ? '时间线' : 'Timeline'}
              </button>
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                  activeTab === 'info' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {language === 'zh' ? '信息' : 'Info'}
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-6"
            style={{ scrollbarGutter: 'stable' }}
          >

            {/* TIMELINE TAB */}
            {activeTab === 'timeline' && (
              <>
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('memories')}</h3>
                    <button
                      onClick={handleShareAsImage}
                      disabled={isGeneratingShare}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs bg-blue-900/20 px-2 py-1 rounded transition disabled:opacity-50"
                    >
                      {isGeneratingShare ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                      {language === 'zh' ? '分享卡片' : 'Share Card'}
                    </button>
                </div>

                {place.visits.length === 0 ? (
                   <div className="text-center text-gray-500 py-10">
                     <p>{t('noExperiences')}</p>
                   </div>
                ) : (
                  sortedVisits.map((visit, index) => {
                    const photos = visit.photos && visit.photos.length > 0 ? visit.photos : [visit.photoDataUrl];
                    const isDeleting = deletingVisitId === visit.id;
                    const isNewlyAdded = newlyAddedVisitId === visit.id;

                    return (
                      <div
                        key={visit.id}
                        className={`
                          bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-sm group
                          transition-all duration-400 ease-out
                          ${isDeleting ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100 scale-100 translate-x-0'}
                          ${isNewlyAdded ? 'visit-card-new' : 'visit-card-animate'}
                        `}
                        style={{ 
                          animationDelay: isNewlyAdded ? '0ms' : `${index * 80}ms`,
                          transitionDelay: isDeleting ? '0ms' : '0ms'
                        }}
                      >

                        <div className="relative">
                          {canEditOrDeleteVisit(visit) && (
                            <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button
                                onClick={() => onEditVisit(place, visit)}
                                className="bg-blue-600/80 hover:bg-blue-500 p-1.5 rounded-full text-white transition-transform hover:scale-110"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(visit)}
                                className="bg-red-600/80 hover:bg-red-500 p-1.5 rounded-full text-white transition-transform hover:scale-110"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}

                          <ImageSlider photos={photos} />

                          {/* Rating Overlay */}
                          <div className={`absolute bottom-2 right-2 z-20 w-16 h-16 flex items-center justify-center rounded-xl shadow-lg font-black text-4xl text-white border border-white/20 backdrop-blur-md bg-black/50 ${getGradeColor(visit.rating)}`}>
                            {visit.rating}
                          </div>

                          {/* User Profile */}
                          {visit.creatorName && (
                            <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-md pl-1 pr-3 py-1 rounded-full flex items-center gap-2 max-w-[70%] border border-white/10 pointer-events-none">
                              {visit.creatorPhotoURL ? (
                                 <img src={visit.creatorPhotoURL} alt="User" className="w-5 h-5 rounded-full object-cover border border-gray-400" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center border border-gray-500">
                                  <User size={10} className="text-gray-300" />
                                </div>
                              )}
                              <span className="text-[10px] text-white font-medium truncate">
                                {visit.creatorName}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          {visit.comment && (
                            <div className="mb-2">
                              <p className="text-gray-300 text-sm">
                                "{showTranslated[visit.id] && translatedComments[visit.id]
                                  ? translatedComments[visit.id]
                                  : visit.comment}"
                              </p>
                              <button
                                onClick={() => handleTranslateComment(visit.id, visit.comment!)}
                                disabled={translatingComments[visit.id]}
                                className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-400 transition-colors"
                              >
                                {translatingComments[visit.id] ? (
                                  <>
                                    <Loader2 size={10} className="animate-spin" />
                                    {t('translating')}
                                  </>
                                ) : (
                                  <>
                                    <Languages size={10} />
                                    {showTranslated[visit.id] && translatedComments[visit.id]
                                      ? t('showOriginal')
                                      : t('translate')}
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-gray-500 text-xs">
                             <Calendar size={12} />
                             <span>{formatDate(visit.date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Add Another Memory Button */}
                {currentUserUid && currentUserUid !== GUEST_ID && (
                  <button
                    onClick={onAddAnotherVisit}
                    className="w-full relative overflow-hidden py-4 rounded-xl border border-dashed border-gray-700 hover:border-gray-600 group transition-all"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                      }}
                    />
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-xl text-gray-500 group-hover:text-violet-400 transition-colors">+</span>
                      <span className="font-medium text-gray-400 group-hover:text-white transition-colors">
                        {language === 'zh' ? '在此添加另一个记忆' : 'Add Another Memory'}
                      </span>
                    </div>
                  </button>
                )}
              </>
            )}

            {/* INFO TAB */}
            {activeTab === 'info' && (
              <div className="space-y-6 animate-fade-in-up">
                 <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                   <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                     {language === 'zh' ? '位置详情' : 'Location Details'}
                   </h3>

                   <div className="space-y-4">
                     <div>
                       <p className="text-xs text-gray-500 mb-1">{language === 'zh' ? '地址' : 'Address'}</p>
                       <p className="text-gray-200">{place.address}</p>
                     </div>

                     {place.location && (
                       <div>
                         <p className="text-xs text-gray-500 mb-1">{language === 'zh' ? '坐标' : 'Coordinates'}</p>
                         <p className="text-gray-300 text-sm font-mono">
                           {place.location.lat.toFixed(6)}, {place.location.lng.toFixed(6)}
                         </p>
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                   <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                     {language === 'zh' ? '统计' : 'Stats'}
                   </h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                       <p className="text-2xl font-bold text-white">{place.visits.length}</p>
                       <p className="text-xs text-gray-500">{language === 'zh' ? '次访问' : 'Visits'}</p>
                     </div>
                     <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                       <p className={`text-2xl font-bold ${getGradeColor(avgGrade)}`}>{avgGrade}</p>
                       <p className="text-xs text-gray-500">{language === 'zh' ? '平均评分' : 'Avg Rating'}</p>
                     </div>
                   </div>
                 </div>

                 <button
                   onClick={handleOpenGoogleMaps}
                   className="w-full flex items-center justify-center gap-2 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 text-gray-300 hover:text-white transition"
                 >
                   <ExternalLink size={16} />
                   {language === 'zh' ? '在 Google Maps 中打开' : 'Open in Google Maps'}
                 </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden Share Card Render */}
      <div
        ref={shareRef}
        className="fixed top-0 left-[-9999px] w-[400px] text-white overflow-hidden"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        <div className="relative" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
          <div className="relative h-[280px] overflow-hidden">
            {sortedVisits[0]?.photoDataUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${shareBase64Map[sortedVisits[0].photoDataUrl] || sortedVisits[0].photoDataUrl})`,
                  filter: 'brightness(0.6)'
                }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(26,26,46,0.95) 100%)' }}
            />
            <div className="relative z-10 h-full flex flex-col justify-end p-6 pb-8">
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <span className="text-white font-bold text-sm">TB</span>
                </div>
                <span className="text-white/90 font-semibold text-sm tracking-wide">TraceBook</span>
              </div>
              <div
                className="absolute top-4 right-4 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <span className={`text-3xl font-black ${getGradeColor(avgGrade)}`}>{avgGrade}</span>
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                {place.name}
              </h1>
              <div className="flex items-center gap-1.5 text-white/70 text-sm">
                <MapPin size={14} className="flex-shrink-0" />
                <span className="truncate">{place.address}</span>
              </div>
            </div>
          </div>
          <div className="flex mx-6 -mt-4 relative z-20 rounded-xl overflow-hidden shadow-lg" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="flex-1 py-4 text-center border-r" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <span className="block text-2xl font-bold text-white">{place.visits.length}</span>
              <span className="text-xs text-white/60 uppercase tracking-wider">{language === 'zh' ? '次访问' : 'Visits'}</span>
            </div>
            <div className="flex-1 py-4 text-center">
              <span className={`block text-2xl font-bold ${getGradeColor(avgGrade)}`}>{avgGrade}</span>
              <span className="text-xs text-white/60 uppercase tracking-wider">{language === 'zh' ? '评分' : 'Rating'}</span>
            </div>
          </div>
          <div className="p-6 pt-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">{language === 'zh' ? '最新体验' : 'Latest Experiences'}</h3>
              <span className="text-xs text-white/50">{sortedVisits.length} {language === 'zh' ? '条记录' : 'memories'}</span>
            </div>
            <div className="space-y-3">
              {sortedVisits.slice(0, 2).map((visit, i) => (
                <div
                  key={i}
                  className="flex gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div
                    className="w-16 h-16 rounded-lg bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: `url(${shareBase64Map[visit.photoDataUrl] || visit.photoDataUrl})`,
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {visit.creatorPhotoURL && (
                          <img
                            src={visit.creatorPhotoURL}
                            className="w-4 h-4 rounded-full border border-white/20"
                          />
                        )}
                        <span className="text-xs text-white/80 font-medium truncate">{visit.creatorName || 'Anonymous'}</span>
                      </div>
                      <span className={`text-sm font-bold ${getGradeColor(visit.rating)}`}>{visit.rating}</span>
                    </div>
                    {visit.comment && (
                      <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">"{visit.comment}"</p>
                    )}
                    <span className="text-[10px] text-white/40 mt-1 block">{formatDate(visit.date)}</span>
                  </div>
                </div>
              ))}
            </div>
            {sortedVisits.length > 2 && (
              <div className="text-center mt-3">
                <span className="text-xs text-white/50">+{sortedVisits.length - 2} {language === 'zh' ? '更多体验' : 'more experiences'}</span>
              </div>
            )}
          </div>
          <div
            className="mx-6 mb-4 p-4 rounded-xl"
            style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.25) 0%, rgba(118,75,162,0.25) 100%)', border: '1px solid rgba(102,126,234,0.3)' }}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=56x56&data=https://TraceMap.ca&bgcolor=ffffff&color=000000&margin=0"
                    alt="QR Code"
                    className="w-14 h-14"
                    crossOrigin="anonymous"
                  />
                </div>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-white font-semibold mb-1">
                  {language === 'zh' ? '扫码加入 TraceBook' : 'Scan to join TraceBook'}
                </p>
                <p className="text-xs text-white/70 leading-relaxed">
                  {language === 'zh'
                    ? '发现美食，分享体验'
                    : 'Discover great food, share experiences'}
                </p>
                <p className="text-[10px] text-white/50 mt-1 font-medium">TraceMap.ca</p>
              </div>
            </div>
          </div>
          <div className="px-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <span className="text-white font-bold text-[10px]">TB</span>
              </div>
              <span className="text-white/60 text-xs font-medium">TraceMap.ca</span>
            </div>
            <span className="text-[10px] text-white/40">{language === 'zh' ? '记录美好体验' : 'Map Your Memories'}</span>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        .visit-card-animate {
          animation: visitCardIn 0.4s ease-out forwards;
          opacity: 0;
          transform: translateY(16px);
        }
        .visit-card-new {
          animation: visitCardNew 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        @keyframes visitCardIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes visitCardNew {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          60% {
            transform: scale(1.02) translateY(-4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default PlaceDetail;
