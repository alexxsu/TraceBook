import React, { useState } from 'react';
import { X, Plus, Map as MapIcon, Users, Lock, Copy, Check } from 'lucide-react';
import { UserMap } from '../types';

interface MapManagementModalProps {
  userMaps: UserMap[];
  sharedMaps: UserMap[];
  activeMap: UserMap | null;
  onClose: () => void;
  onCreateSharedMap: (name: string) => Promise<void>;
  onSelectMap: (map: UserMap) => void;
  maxSharedMaps?: number;
}

const MapManagementModal: React.FC<MapManagementModalProps> = ({
  userMaps,
  sharedMaps,
  activeMap,
  onClose,
  onCreateSharedMap,
  onSelectMap,
  maxSharedMaps = 3
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const allMaps = [...userMaps, ...sharedMaps];
  const userSharedMapsCount = sharedMaps.filter(m => m.visibility === 'shared').length;
  const canCreateMore = userSharedMapsCount < maxSharedMaps;

  const handleCreate = async () => {
    if (!newMapName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateSharedMap(newMapName.trim());
      setNewMapName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create shared map:', error);
      alert('Failed to create shared map. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      alert('Failed to copy code');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div>
              <h2 className="text-lg font-bold text-white">Map Management</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {allMaps.length} map{allMaps.length !== 1 ? 's' : ''} total
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Maps List */}
          <div className="p-4 max-h-80 overflow-y-auto">
            {allMaps.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No maps yet</p>
            ) : (
              <div className="space-y-2">
                {allMaps.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => onSelectMap(map)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left
                      ${activeMap?.id === map.id
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'bg-gray-700/50 border border-transparent hover:bg-gray-700'}
                    `}
                  >
                    <div className={`p-2 rounded-lg ${map.visibility === 'shared' ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
                      {map.visibility === 'shared' ? (
                        <Users size={18} className="text-purple-400" />
                      ) : (
                        <Lock size={18} className="text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">{map.name}</span>
                        {map.isDefault && (
                          <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {map.visibility === 'shared' ? 'Shared' : 'Private'}
                        </span>
                        {map.shareCode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCode(map.shareCode!);
                            }}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition"
                          >
                            <span className="font-mono bg-gray-600 px-1.5 py-0.5 rounded">{map.shareCode}</span>
                            {copiedCode === map.shareCode ? (
                              <Check size={12} className="text-green-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {activeMap?.id === map.id && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create New Shared Map */}
          <div className="p-4 border-t border-gray-700">
            {isCreating ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newMapName}
                  onChange={(e) => setNewMapName(e.target.value.slice(0, 25))}
                  placeholder="Enter map name..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={25}
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{newMapName.length}/25 characters</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewMapName('');
                    }}
                    className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newMapName.trim() || isSubmitting}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:text-gray-400 text-white rounded-lg transition"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                disabled={!canCreateMore}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl transition
                  ${canCreateMore
                    ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'}
                `}
              >
                <Plus size={18} />
                <span>Create Shared Map</span>
                {!canCreateMore && (
                  <span className="text-xs text-gray-500">({maxSharedMaps}/{maxSharedMaps})</span>
                )}
              </button>
            )}
            {canCreateMore && !isCreating && (
              <p className="text-xs text-gray-500 text-center mt-2">
                {userSharedMapsCount}/{maxSharedMaps} shared maps created
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MapManagementModal;
