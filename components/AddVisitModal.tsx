import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Camera, MapPin, Search, Loader2, X, Image as ImageIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Coordinates, PlaceResult, Place, Visit } from '../types';
import { getGPSFromImage } from '../utils/exif';
import { compressImage, validateImage, withTimeout, IMAGE_LIMITS } from '../utils/image';
import { GRADES, getGradeDescription, getGradeColor } from '../utils/rating';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '../hooks/useLanguage';
import heic2any from 'heic2any';

import { searchNearbyPlaces as foursquareNearbySearch, autocompletePlaces, getPlaceDetails } from '../services/foursquareService';

interface AddVisitModalProps {
  mapInstance: mapboxgl.Map | null;
  currentLocation: Coordinates;
  existingPlaces: Place[];
  onClose: () => void;
  onSave: (place: Place, visit: Visit) => void;
  onPhotosUploaded?: (hasPhotos: boolean) => void;
  isGuest?: boolean;
  externalIsClosing?: boolean;
}

interface SuggestionItem {
  place_id: string;
  name: string;
  description: string;
  isPrediction: boolean;
  location?: { lat: number; lng: number };
}

// ========================================
// SUCCESS ANIMATION COMPONENT (Instagram-style)
// ========================================
const SuccessAnimation: React.FC<{ onComplete: () => void; language: string }> = ({ onComplete, language }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md success-overlay-fade">
      <div className="flex flex-col items-center gap-5 success-content-bounce">
        {/* Animated Checkmark with Instagram-style Glow */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gray-900 flex items-center justify-center success-glow-ring">
            <Check className="w-10 h-10 text-white check-draw" strokeWidth={3} />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-1 success-text-1">
            {language === 'zh' ? '体验已保存！' : 'Experience Saved!'}
          </h3>
          <p className="text-gray-400 text-sm success-text-2">
            {language === 'zh' ? '已添加到地图' : 'Added to your map'}
          </p>
        </div>
      </div>
      
      <style>{`
        .success-overlay-fade {
          animation: overlayFade 0.3s ease-out forwards;
        }
        .success-content-bounce {
          animation: contentBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s forwards;
          opacity: 0;
          transform: scale(0.8);
        }
        .success-glow-ring {
          box-shadow: 
            -8px -8px 20px rgba(91, 81, 216, 0.6),
            0 -10px 20px rgba(131, 58, 180, 0.5),
            8px -8px 20px rgba(225, 48, 108, 0.5),
            10px 0 20px rgba(253, 29, 29, 0.4),
            8px 8px 20px rgba(247, 119, 55, 0.4),
            0 10px 20px rgba(252, 175, 69, 0.4),
            -8px 8px 20px rgba(255, 220, 128, 0.3);
          animation: glowPulse 1.5s ease-in-out infinite;
        }
        .check-draw {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawCheck 0.4s ease-out 0.4s forwards;
        }
        .success-text-1 {
          animation: textSlide 0.3s ease-out 0.5s forwards;
          opacity: 0;
          transform: translateY(8px);
        }
        .success-text-2 {
          animation: textSlide 0.3s ease-out 0.65s forwards;
          opacity: 0;
          transform: translateY(8px);
        }
        @keyframes overlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes contentBounce {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { 
            box-shadow: 
              -8px -8px 20px rgba(91, 81, 216, 0.6),
              0 -10px 20px rgba(131, 58, 180, 0.5),
              8px -8px 20px rgba(225, 48, 108, 0.5),
              10px 0 20px rgba(253, 29, 29, 0.4),
              8px 8px 20px rgba(247, 119, 55, 0.4),
              0 10px 20px rgba(252, 175, 69, 0.4),
              -8px 8px 20px rgba(255, 220, 128, 0.3);
          }
          50% { 
            box-shadow: 
              -12px -12px 30px rgba(91, 81, 216, 0.7),
              0 -14px 30px rgba(131, 58, 180, 0.6),
              12px -12px 30px rgba(225, 48, 108, 0.6),
              14px 0 30px rgba(253, 29, 29, 0.5),
              12px 12px 30px rgba(247, 119, 55, 0.5),
              0 14px 30px rgba(252, 175, 69, 0.5),
              -12px 12px 30px rgba(255, 220, 128, 0.4);
          }
        }
        @keyframes drawCheck {
          to { stroke-dashoffset: 0; }
        }
        @keyframes textSlide {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ========================================
// UNDERSTATED SAVE BUTTON
// ========================================
const SaveButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  isSaving: boolean;
  language: string;
}> = ({ onClick, disabled, isSaving, language }) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full py-3.5 rounded-xl font-medium text-base
        transition-all duration-200 ease-out
        ${disabled 
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
          : isSaving
            ? 'bg-gray-700 text-gray-300'
            : 'bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200 active:scale-[0.98]'
        }
      `}
    >
      <span className="flex items-center justify-center gap-2">
        {isSaving ? (
          <>
            <Loader2 size={18} className="animate-spin"/>
            <span>{language === 'zh' ? '保存中...' : 'Saving...'}</span>
          </>
        ) : (
          <span>{language === 'zh' ? '保存体验' : 'Save Experience'}</span>
        )}
      </span>
    </button>
  );
};

// ========================================
// PLACE SUGGESTION ITEM
// ========================================
const PlaceItem: React.FC<{
  place: SuggestionItem;
  index: number;
  onClick: () => void;
  isLoading: boolean;
}> = ({ place, index, onClick, isLoading }) => {
  return (
    <button 
      onClick={onClick}
      disabled={isLoading}
      className={`
        w-full text-left p-3.5 rounded-xl transition-all duration-200
        bg-gray-800/60 hover:bg-gray-700/80
        border border-gray-700/50 hover:border-gray-600
        group place-item-animate
        ${isLoading ? 'opacity-50 cursor-wait' : ''}
      `}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white group-hover:text-blue-300 transition-colors truncate">
            {place.name}
          </p>
          <p className="text-sm text-gray-400 truncate mt-0.5">{place.description}</p>
        </div>
        <div className={`
          p-1.5 rounded-full transition-colors flex-shrink-0
          ${place.isPrediction 
            ? 'bg-gray-700 group-hover:bg-gray-600' 
            : 'bg-green-900/50 group-hover:bg-green-800/50'
          }
        `}>
          {place.isPrediction 
            ? <Search size={12} className="text-gray-400" />
            : <MapPin size={12} className="text-green-400" />
          }
        </div>
      </div>
    </button>
  );
};

// ========================================
// MAIN COMPONENT
// ========================================
const AddVisitModal: React.FC<AddVisitModalProps> = ({
  mapInstance,
  currentLocation,
  existingPlaces,
  onClose,
  onSave,
  onPhotosUploaded,
  isGuest,
  externalIsClosing
}) => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isClosing, setIsClosing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalIsClosing) {
      setIsClosing(true);
    }
  }, [externalIsClosing]);

  const isModalClosing = isClosing || externalIsClosing;

  // Multi-image state
  const [previewBlobs, setPreviewBlobs] = useState<Blob[]>([]); 
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [foundLocation, setFoundLocation] = useState<Coordinates | null>(null);
  
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loadingPlaceId, setLoadingPlaceId] = useState<string | null>(null);

  const [rating, setRating] = useState('A');
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const pendingSaveRef = useRef<{ place: Place; visit: Visit } | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    if (step === 2 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [step]);

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    if (onPhotosUploaded) {
      onPhotosUploaded(previewUrls.length > 0);
    }
  }, [previewUrls, onPhotosUploaded]);

  // ========================================
  // IMAGE PROCESSING
  // ========================================
  const processFile = async (file: File): Promise<{ blob: Blob; error?: string }> => {
    const fileName = file.name;

    if (file.size > IMAGE_LIMITS.MAX_FILE_SIZE) {
      throw new Error(`${fileName}: File too large (max 50MB)`);
    }
    if (file.size < IMAGE_LIMITS.MIN_FILE_SIZE) {
      throw new Error(`${fileName}: File is empty or corrupt`);
    }

    let fileToProcess: Blob = file;

    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
    if (isHeic) {
      try {
        const convertedBlob = await withTimeout(
          heic2any({ blob: file, toType: "image/jpeg", quality: 0.8 }),
          IMAGE_LIMITS.PROCESSING_TIMEOUT,
          `${fileName}: HEIC conversion timed out`
        );
        fileToProcess = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      } catch (err: any) {
        throw new Error(`${fileName}: Failed to convert HEIC - ${err?.message || 'Unknown'}`);
      }
    }

    const validation = await validateImage(fileToProcess);
    if (!validation.valid) {
      throw new Error(`${fileName}: ${validation.error}`);
    }

    try {
      const compressed = await withTimeout(
        compressImage(fileToProcess),
        IMAGE_LIMITS.PROCESSING_TIMEOUT,
        `${fileName}: Compression timed out`
      );
      return { blob: compressed };
    } catch (err: any) {
      throw new Error(`${fileName}: Compression failed - ${err?.message || 'unknown'}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingImg(true);

      const files = Array.from(e.target.files) as File[];
      const firstFile = files[0];

      try {
        const coords = await getGPSFromImage(firstFile);
        const results = await Promise.allSettled(files.map(f => processFile(f)));

        const successfulBlobs: Blob[] = [];
        const failedFiles: string[] = [];

        results.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            successfulBlobs.push(result.value.blob);
          } else {
            failedFiles.push(result.reason?.message || `Unknown error: ${files[i].name}`);
          }
        });

        if (failedFiles.length > 0 && successfulBlobs.length > 0) {
          const summary = failedFiles.slice(0, 3).join('\n');
          alert(`⚠️ ${failedFiles.length} image(s) failed:\n\n${summary}\n\nContinuing with ${successfulBlobs.length} valid image(s).`);
        }

        if (successfulBlobs.length === 0) {
          throw new Error(`All images failed to process`);
        }

        const urls = successfulBlobs.map(b => URL.createObjectURL(b));

        setPreviewBlobs(successfulBlobs);
        setPreviewUrls(urls);
        setIsProcessingImg(false);

        if (coords) {
          setFoundLocation(coords);
          searchNearbyPlaces(coords);
        } else {
          setFoundLocation(null);
          searchNearbyPlaces(currentLocation);
        }
        
        setIsTransitioning(true);
        setTimeout(() => {
          setStep(2);
          setIsTransitioning(false);
        }, 150);

      } catch (error: any) {
        alert(`❌ Failed to process images\n\n${error?.message || 'Unknown'}`);
        setIsProcessingImg(false);
      }
    }
  };

  // ========================================
  // PLACE SEARCH
  // ========================================
  const searchNearbyPlaces = async (loc: Coordinates) => {
    setIsSearching(true);
    setSearchError(null);
    setSuggestions([]);
    
    try {
      const results = await foursquareNearbySearch(loc, { radius: 300, limit: 15 });

      const items: SuggestionItem[] = results.map(r => ({
        place_id: r.place_id!,
        name: r.name!,
        description: r.vicinity || '',
        isPrediction: false,
        location: {
          lat: r.geometry?.location?.lat() || 0,
          lng: r.geometry?.location?.lng() || 0
        }
      }));
      
      setTimeout(() => setSuggestions(items), 100);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not fetch nearby places.';
      setSearchError(message);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSearch = async (query: string) => {
    setManualSearch(query);
    if (query.length < 2) {
      if (query.length === 0) {
        searchNearbyPlaces(foundLocation || currentLocation);
      }
      return;
    }

    setIsSearching(true);
    setSuggestions([]);
    
    try {
      setSearchError(null);
      const predictions = await autocompletePlaces(query, {
        location: foundLocation || currentLocation,
        limit: 10
      });

      const items: SuggestionItem[] = predictions.map(p => ({
        place_id: p.placeId,
        name: p.mainText,
        description: p.secondaryText,
        isPrediction: true
      }));
      
      setTimeout(() => setSuggestions(items), 50);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Search failed.';
      setSearchError(message);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = async (item: SuggestionItem) => {
    setLoadingPlaceId(item.place_id);
    
    if (item.isPrediction) {
      try {
        const placeDetails = await getPlaceDetails(item.place_id);
        
        setSelectedPlace({
          place_id: placeDetails.place_id,
          name: placeDetails.name,
          vicinity: placeDetails.vicinity,
          geometry: placeDetails.geometry
        });
        
        setIsTransitioning(true);
        setTimeout(() => {
          setStep(3);
          setIsTransitioning(false);
          setLoadingPlaceId(null);
        }, 200);
      } catch (e) {
        alert("Could not retrieve details for this location.");
        setLoadingPlaceId(null);
      }
    } else {
      setSelectedPlace({
        place_id: item.place_id,
        name: item.name,
        vicinity: item.description,
        geometry: item.location ? {
          location: {
            lat: () => item.location!.lat,
            lng: () => item.location!.lng
          }
        } : undefined
      });
      
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(3);
        setIsTransitioning(false);
        setLoadingPlaceId(null);
      }, 200);
    }
  };

  // ========================================
  // SAVE HANDLER - Close modal first, then show success
  // ========================================
  const handleSave = async () => {
    if (!selectedPlace || !selectedPlace.geometry?.location || previewBlobs.length === 0) return;

    setIsSaving(true);

    try {
      const uploadPromises = previewBlobs.map(async (blob, index) => {
        const filename = `visits/${selectedPlace.place_id}/${Date.now()}_img_${index}.jpg`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, blob);
        return await getDownloadURL(snapshot.ref);
      });

      const downloadURLs = await Promise.all(uploadPromises);

      const newPlace: Place = {
        id: selectedPlace.place_id || Math.random().toString(),
        name: selectedPlace.name || 'Unknown Spot',
        address: selectedPlace.vicinity || 'Unknown Address',
        location: {
          lat: selectedPlace.geometry.location.lat(),
          lng: selectedPlace.geometry.location.lng()
        },
        visits: []
      };

      const newVisit: Visit = {
        id: Math.random().toString(),
        date: new Date().toISOString(),
        photoDataUrl: downloadURLs[0],
        photos: downloadURLs,
        rating,
        comment,
      };

      // Store for after animation
      pendingSaveRef.current = { place: newPlace, visit: newVisit };
      
      // Step 1: Close modal with smooth animation
      setIsClosing(true);
      
      // Step 2: After modal closes, show success animation
      setTimeout(() => {
        setShowSuccess(true);
      }, 350);
      
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload images. Please try again.");
      setIsSaving(false);
    }
  };

  const handleSuccessComplete = () => {
    if (pendingSaveRef.current) {
      onSave(pendingSaveRef.current.place, pendingSaveRef.current.visit);
    }
  };

  const nextPreview = () => setCurrentPreviewIndex(prev => (prev + 1) % previewUrls.length);
  const prevPreview = () => setCurrentPreviewIndex(prev => (prev - 1 + previewUrls.length) % previewUrls.length);

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (step === 3) setStep(2);
      else if (step === 2) setStep(1);
      setIsTransitioning(false);
    }, 150);
  };

  // ========================================
  // RENDER
  // ========================================
  return (
    <>
      {/* Success Animation - shown after modal closes */}
      {showSuccess && <SuccessAnimation onComplete={handleSuccessComplete} language={language} />}
      
      {/* Main Modal */}
      <div className={`
        fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 
        transition-all duration-300 ease-out
        ${isModalClosing ? 'opacity-0' : 'opacity-100'}
      `}>
        <div
          className={`
            bg-gray-900 w-full max-w-md rounded-2xl 
            border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]
            transition-all duration-300 ease-out
            ${isModalClosing ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}
            ${isTransitioning ? 'opacity-80' : 'opacity-100'}
          `}
        >
          
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button 
                  onClick={handleBack}
                  className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div>
                <h2 className="text-base font-semibold text-white">
                  {step === 1 && t('addMemory')}
                  {step === 2 && (language === 'zh' ? '这是哪里？' : 'Where was this?')}
                  {step === 3 && (language === 'zh' ? '感觉如何？' : 'How was it?')}
                </h2>
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3].map((s) => (
                    <div 
                      key={s} 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        s === step ? 'w-5 bg-white' : s < step ? 'w-2 bg-gray-600' : 'w-2 bg-gray-700'
                      }`} 
                    />
                  ))}
                </div>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className={`
            flex-1 overflow-y-auto p-4 space-y-4 
            transition-all duration-200 ease-out
            ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
          `}>
            
            {/* STEP 1: Photo Upload */}
            {step === 1 && (
              <div className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-gray-700 rounded-xl hover:border-gray-600 hover:bg-gray-800/30 transition-all cursor-pointer relative group">
                {isProcessingImg ? (
                  <div className="flex flex-col items-center text-gray-400">
                    <Loader2 className="animate-spin mb-3" size={32} />
                    <span className="text-sm">
                      {language === 'zh' ? '处理图片中...' : 'Processing...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <input 
                      type="file" 
                      accept="image/*,.heic" 
                      multiple
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleFileChange}
                    />
                    <div className="p-3 rounded-full bg-gray-800 group-hover:bg-gray-700 transition mb-3">
                      <Camera size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-300 font-medium">
                      {language === 'zh' ? '点击上传照片' : 'Tap to upload photos'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {language === 'zh' ? 'JPG, PNG, HEIC' : 'JPG, PNG, HEIC'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: Place Selection */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Preview */}
                {previewUrls.length > 0 && (
                  <div className="h-36 w-full rounded-xl overflow-hidden relative border border-gray-800 bg-gray-900 group">
                    <img 
                      src={previewUrls[currentPreviewIndex]} 
                      className="w-full h-full object-cover" 
                      alt="Preview" 
                    />
                    
                    {foundLocation ? (
                      <div className="absolute top-2 right-2 bg-green-600/90 px-2 py-0.5 rounded-full text-xs text-white flex items-center gap-1">
                        <MapPin size={10} /> Located
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-yellow-600/90 px-2 py-0.5 rounded-full text-xs text-white flex items-center gap-1">
                        <MapPin size={10} /> No GPS
                      </div>
                    )}

                    {previewUrls.length > 1 && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); prevPreview(); }} className="bg-black/50 p-1.5 rounded-full text-white">
                            <ChevronLeft size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); nextPreview(); }} className="bg-black/50 p-1.5 rounded-full text-white">
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                          {previewUrls.map((_, idx) => (
                            <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentPreviewIndex ? 'bg-white' : 'bg-white/40'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    value={manualSearch}
                    onChange={(e) => handleManualSearch(e.target.value)}
                    placeholder={language === 'zh' ? '搜索地点...' : 'Search for a place...'}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {isSearching 
                      ? <Loader2 size={18} className="animate-spin text-gray-500"/> 
                      : <Search size={18} className="text-gray-500"/>
                    }
                  </div>
                </div>
                
                {searchError && (
                  <div className="text-xs text-red-400 px-1">{searchError}</div>
                )}

                {/* Place List */}
                <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
                  {suggestions.length > 0 ? (
                    suggestions.map((place, index) => (
                      <PlaceItem
                        key={place.place_id}
                        place={place}
                        index={index}
                        onClick={() => selectPlace(place)}
                        isLoading={loadingPlaceId === place.place_id}
                      />
                    ))
                  ) : !isSearching && (
                    <div className="text-center py-8">
                      <ImageIcon className="mx-auto mb-2 text-gray-600" size={24} />
                      <p className="text-sm text-gray-500">
                        {language === 'zh' ? '没有找到地点' : 'No places found'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Rating & Save */}
            {step === 3 && selectedPlace && (
              <div className="space-y-5">
                {/* Selected Place */}
                <div className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400 flex-shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{selectedPlace.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{selectedPlace.vicinity}</p>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{t('rating')}</label>
                  <div className="flex gap-2">
                    {GRADES.map((grade) => (
                      <button 
                        key={grade} 
                        onClick={() => setRating(grade)}
                        className={`
                          flex-1 h-12 rounded-xl font-bold text-lg transition-all border
                          ${rating === grade 
                            ? 'bg-white text-gray-900 border-white' 
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-600'}
                        `}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                  <div className={`text-center mt-2 text-sm ${getGradeColor(rating)}`}>
                    {getGradeDescription(rating, language)}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {language === 'zh' ? '备注' : 'Notes'}
                  </label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={language === 'zh' ? '你吃了什么？感觉如何？' : 'What did you have?'}
                    className="w-full h-20 bg-gray-800 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none transition"
                  />
                </div>

                {/* Understated Save Button */}
                <SaveButton
                  onClick={handleSave}
                  disabled={isSaving}
                  isSaving={isSaving}
                  language={language}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{`
        .place-item-animate {
          animation: slideUp 0.25s ease-out forwards;
          opacity: 0;
          transform: translateY(8px);
        }
        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 2px;
        }
      `}</style>
    </>
  );
};

export default AddVisitModal;
