
import React, { useState, useMemo } from 'react';
import { X, MapPin, User as UserIcon, Filter, ChevronDown } from 'lucide-react';
import { Place, Visit } from '../types';
import { GRADES, getGradeColor, getGradeDescription } from '../utils/rating';
import ImageSlider from './ImageSlider';
import { useLanguage } from '../hooks/useLanguage';

interface StatsModalProps {
  places: Place[];
  onClose: () => void;
}

interface FlattenedVisit extends Visit {
  placeName: string;
  placeAddress: string;
}

const StatsModal: React.FC<StatsModalProps> = ({ places, onClose }) => {
  const { t, language } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [selectedRatings, setSelectedRatings] = useState<string[]>(GRADES);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterClosing, setIsFilterClosing] = useState(false);
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  
  // 1. Flatten all visits into a single array with restaurant metadata
  const allVisits: FlattenedVisit[] = useMemo(() => {
    return places.flatMap(r => 
      r.visits.map(v => ({
        ...v,
        placeName: r.name,
        placeAddress: r.address
      }))
    );
  }, [places]);

  // Get unique years from visits
  const availableYears = useMemo(() => {
    const years = new Set(allVisits.map(v => new Date(v.date).getFullYear().toString()));
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [allVisits]);

  // Filter visits based on selected filters
  const filteredVisits = useMemo(() => {
    let filtered = allVisits;
    
    if (selectedRatings.length < GRADES.length) {
      filtered = filtered.filter(v => selectedRatings.includes(v.rating));
    }
    
    if (selectedYear) {
      filtered = filtered.filter(v => new Date(v.date).getFullYear().toString() === selectedYear);
    }
    
    return filtered;
  }, [allVisits, selectedRatings, selectedYear]);

  // 2. Group filtered visits by Rating
  const visitsByRating: Record<string, FlattenedVisit[]> = useMemo(() => {
    const grouped: Record<string, FlattenedVisit[]> = {};
    GRADES.forEach(grade => {
      grouped[grade] = filteredVisits
        .filter(v => v.rating === grade)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    return grouped;
  }, [filteredVisits]);

  // Get translated grade description
  const getTranslatedGradeDesc = (grade: string) => {
    const gradeDescKeys: Record<string, string> = {
      'S': 'gradeS',
      'A': 'gradeA',
      'B': 'gradeB',
      'C': 'gradeC',
      'D': 'gradeD',
      'E': 'gradeE',
    };
    return t(gradeDescKeys[grade] as any) || getGradeDescription(grade);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  const toggleFilter = () => {
    if (showFilters) {
      setIsFilterClosing(true);
      setTimeout(() => {
        setShowFilters(false);
        setIsFilterClosing(false);
      }, 200);
    } else {
      setShowFilters(true);
    }
  };

  const toggleGradeExpand = (grade: string) => {
    setExpandedGrades(prev => ({
      ...prev,
      [grade]: !prev[grade]
    }));
  };

  const toggleRating = (rating: string) => {
    setSelectedRatings(prev => 
      prev.includes(rating)
        ? prev.filter(r => r !== rating)
        : [...prev, rating]
    );
  };

  const selectAllRatings = () => setSelectedRatings(GRADES);
  const clearAllRatings = () => setSelectedRatings([]);

  const clearFilters = () => {
    setSelectedRatings(GRADES);
    setSelectedYear(null);
  };

  const hasActiveFilters = selectedRatings.length < GRADES.length || selectedYear;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-250 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-gray-900 w-full max-w-4xl rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-250 ease-out ${isClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}
        style={{ 
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          animation: !isClosing ? 'scaleIn 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
          WebkitAnimation: !isClosing ? 'scaleIn 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-start bg-gray-900/50">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              📊 {t('statistics')}
            </h2>
            <span className="text-gray-500 text-sm">
              {filteredVisits.length} {t('experiences')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFilter}
              className={`p-2 rounded-lg transition relative ${showFilters || hasActiveFilters ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`}
            >
              <Filter size={18} />
              {hasActiveFilters && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>
            <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filter Section with animation */}
        {(showFilters || isFilterClosing) && (
          <div className={`p-4 border-b border-gray-700 bg-gray-900/30 space-y-4 ${isFilterClosing ? 'animate-scale-out' : 'animate-scale-in'}`}>
            {/* Rating Filter Grid */}
            <div>
              <div className="text-xs text-gray-400 font-bold uppercase mb-2">{t('filterByRating')}</div>
              <div className="grid grid-cols-6 gap-1.5">
                {GRADES.map(grade => (
                  <button
                    key={grade}
                    onClick={() => toggleRating(grade)}
                    className={`text-sm font-bold py-2 rounded-lg transition border
                      ${selectedRatings.includes(grade)
                        ? `${getGradeColor(grade)} bg-gray-700 border-gray-600`
                        : 'text-gray-600 border-transparent hover:bg-gray-700/50'}
                    `}
                  >
                    {grade}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs mt-2">
                <button onClick={selectAllRatings} className="text-blue-400 hover:text-blue-300">{t('selectAll')}</button>
                <button onClick={clearAllRatings} className="text-gray-500 hover:text-gray-400">{t('clearAll')}</button>
              </div>
            </div>
            
            {/* Year Filter */}
            {availableYears.length > 0 && (
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase mb-2">{t('year')}</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedYear(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition border
                      ${selectedYear === null
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'text-gray-400 border-gray-600 hover:bg-gray-700'}
                    `}
                  >
                    {t('all')}
                  </button>
                  {availableYears.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition border
                        ${selectedYear === year
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                          : 'text-gray-400 border-gray-600 hover:bg-gray-700'}
                      `}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {hasActiveFilters && (
              <div className="flex justify-end">
                <button 
                  onClick={clearFilters}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  {t('clearFilter')}
                </button>
              </div>
            )}
          </div>
        )}

        <div 
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/50"
          style={{ scrollbarGutter: 'stable' }}
        >
          
          {GRADES.map((grade, gradeIndex) => {
            const visits = visitsByRating[grade];
            if (visits.length === 0) return null;
            
            const isExpanded = expandedGrades[grade] ?? false;

            return (
              <div 
                key={grade} 
                className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden"
              >
                {/* Collapsible Header */}
                <button
                  onClick={() => toggleGradeExpand(grade)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors duration-200"
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-black ${getGradeColor(grade)} w-12 text-center`}>
                      {grade}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`font-bold text-base ${getGradeColor(grade)}`}>
                        {getTranslatedGradeDesc(grade)}
                      </span>
                      <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">
                        {visits.length} {t('experiences')}
                      </span>
                    </div>
                  </div>
                  <ChevronDown 
                    size={20} 
                    className="text-gray-400"
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      WebkitTransform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                      WebkitTransition: '-webkit-transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </button>
                
                {/* Collapsible Content */}
                <div 
                  className="overflow-hidden"
                  style={{
                    maxHeight: isExpanded ? '2000px' : '0px',
                    opacity: isExpanded ? 1 : 0,
                    transition: isExpanded 
                      ? 'max-height 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out'
                      : 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out',
                    WebkitTransition: isExpanded 
                      ? 'max-height 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease-out'
                      : 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out',
                  }}
                >
                  <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visits.map(visit => {
                       const photos = visit.photos && visit.photos.length > 0 ? visit.photos : [visit.photoDataUrl];
                       
                       return (
                         <div key={visit.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-sm flex flex-col">
                           {/* Reusable Image Slider */}
                           <div className="relative">
                              <ImageSlider photos={photos} />
                              <div className="absolute bottom-2 left-2 z-10 bg-black/60 backdrop-blur-md pl-1 pr-2 py-0.5 rounded-full flex items-center gap-1.5 max-w-[85%] border border-white/10 pointer-events-none">
                                {visit.creatorPhotoURL ? (
                                   <img src={visit.creatorPhotoURL} alt="User" className="w-4 h-4 rounded-full object-cover" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center">
                                    <UserIcon size={8} className="text-gray-300" />
                                  </div>
                                )}
                                <span className="text-[10px] text-white font-medium truncate">
                                  {visit.creatorName}
                                </span>
                              </div>
                           </div>

                           <div className="p-3 flex-1 flex flex-col">
                              <div className="flex justify-between items-start mb-1">
                                 <h3 className="font-bold text-white truncate text-sm" title={visit.placeName}>
                                   {visit.placeName}
                                 </h3>
                                 <span className="text-[10px] text-gray-500 font-mono mt-0.5 whitespace-nowrap">
                                   {formatDate(visit.date)}
                                 </span>
                              </div>
                              
                              <div className="flex items-center gap-1 text-gray-500 text-[10px] mb-2">
                                <MapPin size={10} />
                                <span className="truncate">{visit.placeAddress}</span>
                              </div>

                              {visit.comment && (
                                 <p className="text-gray-300 text-xs italic line-clamp-2 mt-auto">"{visit.comment}"</p>
                              )}
                           </div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredVisits.length === 0 && (
             <div className="text-center py-20 text-gray-500">
               {hasActiveFilters ? (
                 <>
                   <p className="text-lg">{t('noResults')}</p>
                   <button 
                     onClick={clearFilters}
                     className="text-sm mt-2 text-blue-400 hover:text-blue-300"
                   >
                     {t('clearFilter')}
                   </button>
                 </>
               ) : (
                 <>
                   <p className="text-lg">{t('noData')}</p>
                   <p className="text-sm">{t('startAdding')}</p>
                 </>
               )}
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StatsModal;
