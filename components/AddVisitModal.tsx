import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { Camera, MapPin, Search, Loader2, X, Image as ImageIcon, ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react';
import { Coordinates, PlaceResult, Place, Visit } from '../types';
import { getGPSFromImage } from '../utils/exif';
import { compressImage, validateImage, withTimeout, IMAGE_LIMITS } from '../utils/image';
import { GRADES, getGradeDescription, getGradeColor } from '../utils/rating';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '../hooks/useLanguage';
import heic2any from 'heic2any';

// Import place search service
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
// SUCCESS ANIMATION COMPONENT
// ========================================
const SuccessAnimation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="flex flex-col items-center gap-6 animate-success-bounce">
        {/* Animated Checkmark with Glow */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center animate-success-glow">
            <Check className="w-12 h-12 text-white animate-check-draw" strokeWidth={3} />
          </div>
          {/* Colorful glow rings */}
          <div className="absolute inset-0 rounded-full animate-ring-pulse" 
               style={{ 
                 boxShadow: '-10px -10px 30px 0px #5B51D8, 0 -10px 30px 0px #833AB4, 10px -10px 30px 0px #E1306C, 10px 0 30px 0px #FD1D1D, 10px 10px 30px 0px #F77737, 0 10px 30px 0px #FCAF45, -10px 10px 30px 0px #FFDC80'
               }} 
          />
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-2 animate-fade-in-up">Experience Saved!</h3>
          <p className="text-gray-400 animate-fade-in-up animation-delay-100">Added to your map</p>
        </div>
      </div>
    </div>
  );
};

// ========================================
// ELEGANT SAVE BUTTON COMPONENT
// ========================================
const SaveButton: React.FC<{
  onClick: () => void;
  disabled: boolean;
  isSaving: boolean;
  photoCount: number;
  language: string;
}> = ({ onClick, disabled, isSaving, photoCount, language }) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-full py-4 rounded-2xl font-bold text-lg overflow-hidden
        transition-all duration-500 ease-out transform
        ${disabled 
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
          : 'text-white hover:scale-[1.02] active:scale-[0.98]'
        }
        ${!disabled && !isSaving && 'bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-500 hover:via-purple-500 hover:to-pink-500'}
        ${isSaving && 'bg-gradient-to-r from-blue-600 to-cyan-600'}
      `}
      style={{
        boxShadow: disabled ? 'none' : '0 10px 40px -10px rgba(139, 92, 246, 0.5)'
      }}
    >
      {/* Animated gradient overlay */}
      {!disabled && !isSaving && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
      )}
      
      <span className="relative flex items-center justify-center gap-3">
        {isSaving ? (
          <>
            <Loader2 size={22} className="animate-spin"/>
            <span>{language === 'zh' ? `上传 ${photoCount} 张照片中...` : `Uploading ${photoCount} Photos...`}</span>
          </>
        ) : (
          <>
            <Sparkles size={22} className="animate-pulse" />
            <span>{language === 'zh' ? '保存体验' : 'Save Experience'}</span>
          </>
        )}
      </span>
    </button>
  );
};

// ========================================
// PLACE SUGGESTION ITEM COMPONENT
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
        w-full text-left p-4 rounded-xl transition-all duration-300 ease-out
        bg-gradient-to-r from-gray-800/80 to-gray-800/40
        hover:from-gray-700/90 hover:to-gray-700/50
        border border-gray-700/50 hover:border-purple-500/50
        transform hover:scale-[1.02] hover:-translate-y-0.5
        group animate-slide-up
        ${isLoading ? 'opacity-50 cursor-wait' : ''}
      `}
      style={{ 
        animationDelay: `${index * 50}ms`,
        boxShadow: '0 4px 20px -5px rgba(0,0,0,0.3)'
      }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white group-hover:text-purple-300 transition-colors duration-200 truncate">
            {place.name}
          </p>
          <p className="text-sm text-gray-400 truncate mt-0.5">{place.description}</p>
        </div>
        <div className={`
          p-2 rounded-full transition-all duration-300
          ${place.isPrediction 
            ? 'bg-gray-700 group-hover:bg-purple-600' 
            : 'bg-green-900/50 group-hover:bg-green-600'
          }
        `}>
          {place.isPrediction 
            ? <Search size={14} className="text-gray-400 group-hover:text-white transition-colors" />
            : <MapPin size={14} className="text-green-400 group-hover:text-white transition-colors" />
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

  // Sync with external closing state
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

  // Pending save data for after animation
  const pendingSaveRef = useRef<{ place: Place; visit: Visit } | null>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  // Auto-focus search input when entering step 2
  useEffect(() => {
    if (step === 2 && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [step]);

  // Cleanup blob URLs
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
        
        // Smooth transition to step 2
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
    setSuggestions([]); // Clear for animation
    
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
      
      // Small delay for animation effect
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
      // Reset to nearby if search cleared
      if (query.length === 0) {
        searchNearbyPlaces(foundLocation || currentLocation);
      }
      return;
    }

    setIsSearching(true);
    setSuggestions([]); // Clear for animation
    
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
        
        // Smooth transition to step 3
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
      
      // Smooth transition to step 3
      setIsTransitioning(true);
      setTimeout(() => {
        setStep(3);
        setIsTransitioning(false);
        setLoadingPlaceId(null);
      }, 200);
    }
  };

  // ========================================
  // SAVE HANDLER
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
      
      // Show success animation
      setShowSuccess(true);
      
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

  // Carousel helpers
  const nextPreview = () => setCurrentPreviewIndex(prev => (prev + 1) % previewUrls.length);
  const prevPreview = () => setCurrentPreviewIndex(prev => (prev - 1 + previewUrls.length) % previewUrls.length);

  // Go back handler
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
      {/* Success Animation Overlay */}
      {showSuccess && <SuccessAnimation onComplete={handleSuccessComplete} />}
      
      {/* Main Modal */}
      <div className={`
        fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 
        transition-all duration-300 ease-out
        ${isModalClosing ? 'opacity-0' : 'opacity-100'}
      `}>
        <div
          className={`
            bg-gradient-to-b from-gray-900 to-gray-950 w-full max-w-md rounded-3xl 
            border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]
            transition-all duration-300 ease-out
            ${isModalClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}
            ${isTransitioning ? 'opacity-80' : 'opacity-100'}
          `}
          style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05)' }}
        >
          
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button 
                  onClick={handleBack}
                  className="p-1.5 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-all duration-200"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {step === 1 && t('addMemory')}
                  {step === 2 && (language === 'zh' ? '这是哪里？' : 'Where was this?')}
                  {step === 3 && (language === 'zh' ? '感觉如何？' : 'How was it?')}
                </h2>
                {/* Step indicator */}
                <div className="flex gap-1.5 mt-1">
                  {[1, 2, 3].map((s) => (
                    <div 
                      key={s} 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        s === step ? 'w-6 bg-purple-500' : s < step ? 'w-3 bg-purple-700' : 'w-3 bg-gray-700'
                      }`} 
                    />
                  ))}
                </div>
              </div>
            </div>
            <button 
              onClick={handleClose} 
              className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-all duration-200"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className={`
            flex-1 overflow-y-auto p-4 space-y-4 
            transition-all duration-300 ease-out
            ${isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
          `}>
            
            {/* STEP 1: Photo Upload */}
            {step === 1 && (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-700 rounded-2xl hover:border-purple-500 hover:bg-purple-500/5 transition-all duration-300 cursor-pointer relative group">
                {isProcessingImg ? (
                  <div className="flex flex-col items-center text-purple-400">
                    <div className="relative">
                      <Loader2 className="animate-spin mb-3" size={40} />
                      <div className="absolute inset-0 animate-ping opacity-30">
                        <Loader2 size={40} />
                      </div>
                    </div>
                    <span className="text-sm font-medium">
                      {language === 'zh' 
                        ? `处理 ${previewUrls.length || ''} 张图片中...` 
                        : `Processing ${previewUrls.length || ''} images...`}
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
                    <div className="p-4 rounded-full bg-gray-800 group-hover:bg-purple-900/50 transition-all duration-300 mb-3">
                      <Camera size={32} className="text-gray-400 group-hover:text-purple-400 transition-colors" />
                    </div>
                    <p className="text-gray-300 font-medium group-hover:text-white transition-colors">
                      {language === 'zh' ? '点击上传照片' : 'Tap to upload photos'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {language === 'zh' ? '支持多选 (JPG, PNG, HEIC)' : 'Multi-select supported (JPG, PNG, HEIC)'}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* STEP 2: Place Selection */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Preview Carousel */}
                {previewUrls.length > 0 && (
                  <div className="h-40 w-full rounded-2xl overflow-hidden relative border border-gray-700 bg-gray-900 group">
                    <img 
                      src={previewUrls[currentPreviewIndex]} 
                      className="w-full h-full object-cover transition-transform duration-500" 
                      alt="Preview" 
                    />
                    
                    {/* GPS Indicator */}
                    {foundLocation ? (
                      <div className="absolute top-2 right-2 bg-green-600/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white flex items-center gap-1.5 shadow-lg">
                        <MapPin size={12} /> {language === 'zh' ? '已定位' : 'Located'}
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-yellow-600/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white flex items-center gap-1.5 shadow-lg">
                        <MapPin size={12} /> {language === 'zh' ? '无GPS' : 'No GPS'}
                      </div>
                    )}

                    {/* Carousel Controls */}
                    {previewUrls.length > 1 && (
                      <>
                        <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button onClick={(e) => { e.stopPropagation(); prevPreview(); }} className="bg-black/60 hover:bg-black/80 p-2 rounded-full text-white backdrop-blur-sm transition-all">
                            <ChevronLeft size={18} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); nextPreview(); }} className="bg-black/60 hover:bg-black/80 p-2 rounded-full text-white backdrop-blur-sm transition-all">
                            <ChevronRight size={18} />
                          </button>
                        </div>
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1 rounded-full backdrop-blur-sm">
                          {previewUrls.map((_, idx) => (
                            <div 
                              key={idx} 
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                                idx === currentPreviewIndex ? 'bg-white w-3' : 'bg-white/40'
                              }`} 
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Search Input */}
                <div className="space-y-3">
                  <div className="relative">
                    <input 
                      ref={searchInputRef}
                      type="text" 
                      value={manualSearch}
                      onChange={(e) => handleManualSearch(e.target.value)}
                      placeholder={language === 'zh' ? '搜索地点...' : 'Search for a place...'}
                      className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-3 pl-11 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                      {isSearching 
                        ? <Loader2 size={18} className="animate-spin text-purple-400"/> 
                        : <Search size={18} className="text-gray-500"/>
                      }
                    </div>
                  </div>
                  
                  {searchError && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                      {searchError}
                    </div>
                  )}
                </div>

                {/* Place Suggestions with Animation */}
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
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
                    <div className="text-center py-10 animate-fade-in">
                      <div className="p-4 rounded-full bg-gray-800 inline-block mb-3">
                        <ImageIcon className="opacity-50" size={28} />
                      </div>
                      <p className="text-sm text-gray-400">
                        {language === 'zh' ? '附近没有找到地点' : 'No places found nearby'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'zh' ? '请尝试搜索名称' : 'Try searching by name'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Rating & Save */}
            {step === 3 && selectedPlace && (
              <div className="space-y-5 animate-fade-in">
                {/* Selected Place Card */}
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/20">
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-3 rounded-xl text-white shadow-lg">
                    <MapPin size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-lg truncate">{selectedPlace.name}</h3>
                    <p className="text-sm text-gray-400 truncate">{selectedPlace.vicinity}</p>
                  </div>
                </div>

                {/* Rating Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">{t('rating')}</label>
                  <div className="flex gap-2 justify-between">
                    {GRADES.map((grade) => (
                      <button 
                        key={grade} 
                        onClick={() => setRating(grade)}
                        className={`
                          flex-1 h-14 rounded-xl font-bold text-xl transition-all duration-300 border-2
                          transform hover:scale-105
                          ${rating === grade 
                            ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400 text-white shadow-lg shadow-purple-500/30 scale-105' 
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-600'}
                        `}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                  <div className={`text-center mt-3 text-sm font-medium transition-all duration-300 ${getGradeColor(rating)}`}>
                    {getGradeDescription(rating, language)}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {language === 'zh' ? '备注' : 'Notes'}
                  </label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={language === 'zh' ? '你吃了什么？感觉如何？' : 'What did you have? How was it?'}
                    className="w-full h-24 bg-gray-800/80 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none transition-all duration-200"
                  />
                </div>

                {/* Save Button */}
                <SaveButton
                  onClick={handleSave}
                  disabled={isSaving}
                  isSaving={isSaving}
                  photoCount={previewBlobs.length}
                  language={language}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          to {
            transform: translateX(200%);
          }
        }
        
        @keyframes success-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes success-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.5); }
          50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.8); }
        }
        
        @keyframes ring-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        
        @keyframes check-draw {
          0% { stroke-dashoffset: 50; }
          100% { stroke-dashoffset: 0; }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
          opacity: 0;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-success-bounce {
          animation: success-bounce 0.6s ease-out;
        }
        
        .animate-success-glow {
          animation: success-glow 1.5s ease-in-out infinite;
        }
        
        .animate-ring-pulse {
          animation: ring-pulse 1.5s ease-in-out infinite;
        }
        
        .animation-delay-100 {
          animation-delay: 100ms;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 4px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
    </>
  );
};

export default AddVisitModal;
