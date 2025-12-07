
import React, { useState, useEffect } from 'react';
import { X, Loader2, Camera, Trash2, Save, Check } from 'lucide-react';
import { Visit, Place } from '../types';
import { GRADES } from '../utils/rating';
import { compressImage } from '../utils/image';
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import heic2any from 'heic2any';
import { useLanguage } from '../hooks/useLanguage';

interface EditVisitModalProps {
  visit: Visit;
  place: Place;
  onClose: () => void;
  onSave: (placeId: string, oldVisit: Visit, newVisit: Visit) => void;
}

// Success animation after save
const SaveSuccessIndicator: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm edit-success-overlay">
      <div className="flex flex-col items-center gap-4 edit-success-content">
        <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center">
          <Check className="w-8 h-8 text-white" strokeWidth={3} />
        </div>
        <p className="text-white font-medium">Changes Saved!</p>
      </div>
      
      <style>{`
        .edit-success-overlay {
          animation: editOverlayIn 0.2s ease-out forwards;
        }
        .edit-success-content {
          animation: editContentIn 0.3s ease-out 0.1s forwards;
          opacity: 0;
          transform: scale(0.9);
        }
        @keyframes editOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes editContentIn {
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const EditVisitModal: React.FC<EditVisitModalProps> = ({
  visit,
  place,
  onClose,
  onSave
}) => {
  const { t, language } = useLanguage();
  const [rating, setRating] = useState(visit.rating);
  const [comment, setComment] = useState(visit.comment);
  const [isClosing, setIsClosing] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    visit.photos && visit.photos.length > 0 ? visit.photos : [visit.photoDataUrl]
  );
  
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingImg, setIsProcessingImg] = useState(false);

  const pendingSaveRef = React.useRef<{ placeId: string; oldVisit: Visit; newVisit: Visit } | null>(null);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsEntering(false);
      });
    });
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 250);
  };

  useEffect(() => {
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [newPreviews]);

  const processFile = async (file: File): Promise<Blob> => {
    let fileToProcess: Blob = file;
    
    const isHeic = file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic';
    if (isHeic) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.8
        });
        fileToProcess = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      } catch (err) {
        console.error("HEIC conversion failed", err);
      }
    }

    try {
      return await compressImage(fileToProcess);
    } catch (err) {
      console.error("Compression failed", err);
      return fileToProcess;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessingImg(true);
      const files = Array.from(e.target.files) as File[];
      
      try {
        const blobs = await Promise.all(files.map(f => processFile(f)));
        const filesToUpload = blobs.map((b, i) => new File([b], files[i].name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg' }));
        const previewUrls = blobs.map(b => URL.createObjectURL(b));

        setNewFiles(prev => [...prev, ...filesToUpload]);
        setNewPreviews(prev => [...prev, ...previewUrls]);
      } catch (error) {
        console.error("Error processing images", error);
      } finally {
        setIsProcessingImg(false);
      }
    }
  };

  const removeExistingPhoto = (index: number) => {
    setExistingPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewPhoto = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (existingPhotos.length === 0 && newFiles.length === 0) {
      alert("You must have at least one photo.");
      return;
    }

    setIsSaving(true);

    try {
      const uploadPromises = newFiles.map(async (file, index) => {
        const filename = `visits/${place.id}/${Date.now()}_edit_${index}.jpg`;
        const storageRef = ref(storage, filename);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const finalPhotos = [...existingPhotos, ...uploadedUrls];

      const updatedVisit: Visit = {
        ...visit,
        rating,
        comment,
        photos: finalPhotos,
        photoDataUrl: finalPhotos[0],
      };

      pendingSaveRef.current = { placeId: place.id, oldVisit: visit, newVisit: updatedVisit };
      
      // Close edit modal first
      setIsClosing(true);
      
      // Show success after modal closes
      setTimeout(() => {
        setShowSuccess(true);
      }, 280);

    } catch (error) {
      console.error("Failed to update visit:", error);
      alert("Failed to update. Please try again.");
      setIsSaving(false);
    }
  };

  const handleSuccessComplete = () => {
    if (pendingSaveRef.current) {
      onSave(
        pendingSaveRef.current.placeId,
        pendingSaveRef.current.oldVisit,
        pendingSaveRef.current.newVisit
      );
    }
  };

  return (
    <>
      {showSuccess && <SaveSuccessIndicator onComplete={handleSuccessComplete} />}
      
      <div 
        className={`
          fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 
          transition-opacity duration-250
          ${isClosing ? 'opacity-0' : isEntering ? 'opacity-0' : 'opacity-100'}
        `}
      >
        <div
          className={`
            bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-700/50 shadow-2xl 
            overflow-hidden flex flex-col max-h-[90vh]
            transition-all duration-250 ease-out
            ${isClosing ? 'scale-95 opacity-0 translate-y-4' : isEntering ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}
          `}
        >
          
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">
              {language === 'zh' ? '编辑体验' : 'Edit Experience'}
            </h2>
            <button 
              onClick={handleClose} 
              className="p-1.5 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            
            {/* Photos Section */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {language === 'zh' ? '照片' : 'Photos'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Existing Photos */}
                {existingPhotos.map((url, i) => (
                  <div 
                    key={`existing-${i}`} 
                    className="relative group aspect-square rounded-lg overflow-hidden border border-gray-700 photo-item"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <img src={url} alt="Existing" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeExistingPhoto(i)}
                      className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* New Photos Preview */}
                {newPreviews.map((url, i) => (
                  <div 
                    key={`new-${i}`} 
                    className="relative group aspect-square rounded-lg overflow-hidden border-2 border-green-600/50 photo-item-new"
                  >
                     <img src={url} alt="New" className="w-full h-full object-cover" />
                     <div className="absolute top-1 left-1 bg-green-600 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                       NEW
                     </div>
                     <button 
                      onClick={() => removeNewPhoto(i)}
                      className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 p-1 rounded-full text-white"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* Add Button */}
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-600 rounded-lg hover:border-gray-500 hover:bg-gray-800/30 transition cursor-pointer">
                   {isProcessingImg ? (
                      <Loader2 className="animate-spin text-gray-400" size={20} />
                   ) : (
                     <>
                       <Camera size={22} className="text-gray-500" />
                       <span className="text-xs text-gray-500 mt-1">
                         {language === 'zh' ? '添加' : 'Add'}
                       </span>
                       <input 
                        type="file" 
                        accept="image/*,.heic" 
                        multiple 
                        className="hidden" 
                        onChange={handleFileChange} 
                       />
                     </>
                   )}
                </label>
              </div>
            </div>

            {/* Rating Section */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {language === 'zh' ? '评分' : 'Grade'}
              </label>
              <div className="flex gap-2">
                {GRADES.map((g) => (
                  <button 
                    key={g} 
                    onClick={() => setRating(g)}
                    className={`
                      flex-1 h-11 rounded-xl font-bold text-lg transition-all border
                      ${rating === g 
                        ? 'bg-white text-gray-900 border-white' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-600'}
                    `}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment Section */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">{t('notes')}</label>
              <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('updateComment')}
                className="w-full h-24 bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none transition"
              />
            </div>

            {/* Save Button - Understated style */}
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`
                w-full py-3.5 rounded-xl font-medium text-base
                transition-all duration-200 ease-out
                ${isSaving 
                  ? 'bg-gray-700 text-gray-300 cursor-wait' 
                  : 'bg-white text-gray-900 hover:bg-gray-100 active:bg-gray-200 active:scale-[0.98]'}
              `}
            >
              <span className="flex items-center justify-center gap-2">
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin"/>
                    <span>{t('updating')}</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{t('saveChanges')}</span>
                  </>
                )}
              </span>
            </button>

          </div>
        </div>
      </div>

      <style>{`
        .photo-item {
          animation: photoFadeIn 0.3s ease-out forwards;
          opacity: 0;
        }
        .photo-item-new {
          animation: photoNewIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
          transform: scale(0.8);
        }
        @keyframes photoFadeIn {
          to { opacity: 1; }
        }
        @keyframes photoNewIn {
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
};

export default EditVisitModal;
