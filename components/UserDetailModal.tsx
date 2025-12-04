import React from 'react';
import { X, User as UserIcon, Clock, LogOut } from 'lucide-react';
import { UserProfile } from '../types';
import { AppUser } from '../hooks/useAuth';

interface UserDetailModalProps {
  user: AppUser;
  userProfile: UserProfile | null;
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onViewHistory: () => void;
  onLogout: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  userProfile,
  isOpen,
  isClosing,
  onClose,
  onViewHistory,
  onLogout
}) => {
  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto transform transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-24 right-6 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          {/* User Profile Section */}
          <div className="p-6 text-center">
            {user.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-24 h-24 rounded-full mx-auto border-4 border-gray-700 shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full mx-auto bg-gray-700 flex items-center justify-center border-4 border-gray-600">
                <UserIcon size={40} className="text-gray-400" />
              </div>
            )}
            <h2 className="text-xl font-bold text-white mt-4">{user.displayName || 'User'}</h2>
            {user.email && (
              <p className="text-gray-400 text-sm mt-1">{user.email}</p>
            )}
            {userProfile?.role === 'admin' && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                Admin
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-gray-700 space-y-2">
            <button
              onClick={() => {
                onClose();
                onViewHistory();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
            >
              <Clock size={18} />
              <span className="font-medium">View History</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
            >
              <LogOut size={18} />
              <span className="font-medium">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
