import React, { useState, useEffect } from 'react';
import { X, Users, Check, XIcon, Trash2, Loader2, ChevronRight, ArrowLeft, Shield, Mail, Clock, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, sendSignInLinkToEmail } from 'firebase/auth';
import { db } from '../firebaseConfig';
import { UserProfile } from '../types';
import { useLanguage } from '../hooks/useLanguage';

interface UserWithId extends UserProfile {
  id: string;
}

interface SiteManagementModalProps {
  onClose: () => void;
}

type ManagementView = 'menu' | 'users' | 'userDetail';

export const SiteManagementModal: React.FC<SiteManagementModalProps> = ({
  onClose
}) => {
  const { t, language } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [currentView, setCurrentView] = useState<ManagementView>('menu');
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'back'>('forward');
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithId | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const navigateTo = (view: ManagementView) => {
    setTransitionDirection('forward');
    setIsViewTransitioning(true);
    setTimeout(() => {
      setCurrentView(view);
      setIsViewTransitioning(false);
    }, 250);
  };

  const goBack = () => {
    setTransitionDirection('back');
    setIsViewTransitioning(true);
    setResendSuccess(false);
    setTimeout(() => {
      if (currentView === 'userDetail') {
        setCurrentView('users');
        setSelectedUser(null);
      } else {
        setCurrentView('menu');
      }
      setIsViewTransitioning(false);
    }, 250);
  };

  const navigateToUserDetail = (user: UserWithId) => {
    setSelectedUser(user);
    setResendSuccess(false);
    setTransitionDirection('forward');
    setIsViewTransitioning(true);
    setTimeout(() => {
      setCurrentView('userDetail');
      setIsViewTransitioning(false);
    }, 250);
  };

  // Fetch all users
  const fetchUsers = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList: UserWithId[] = [];
      snapshot.forEach((doc) => {
        usersList.push({
          id: doc.id,
          ...doc.data() as UserProfile
        });
      });
      // Sort by createdAt, newest first
      usersList.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setUsers(usersList);
      
      if (usersList.length === 0) {
        console.log('No users found in collection');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setFetchError(error.message || 'Failed to fetch users. Check Firestore rules.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentView === 'users') {
      fetchUsers();
    }
  }, [currentView]);

  const approvedUsers = users.filter(u => u.status === 'approved');
  const pendingUsers = users.filter(u => u.status === 'pending');

  const handleApproveUser = async (userId: string, override: boolean = false) => {
    const user = users.find(u => u.id === userId);
    
    // If not override and email not verified, warn
    if (!override && user && !user.emailVerified) {
      if (!window.confirm(
        language === 'zh' 
          ? '此用户尚未验证邮箱。确定要批准吗？' 
          : 'This user has not verified their email. Are you sure you want to approve?'
      )) {
        return;
      }
    }
    
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: 'approved' });
      
      // Send notification to the approved user
      const notificationsRef = collection(db, 'notifications');
      await addDoc(notificationsRef, {
        recipientUid: userId,
        type: 'join_approved',
        message: 'Welcome! Your account has been approved. You can now start adding your food memories.',
        read: false,
        createdAt: serverTimestamp(),
      });
      
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: 'approved' } : u
      ));
      
      // Update selected user if in detail view
      if (selectedUser?.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, status: 'approved' } : null);
      }
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!window.confirm(t('confirmRejectUser'))) {
      return;
    }
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { status: 'rejected' });
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, status: 'rejected' } : u
      ));
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert(t('saveFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('confirmDeleteUser'))) {
      return;
    }
    setActionLoading(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      setUsers(prev => prev.filter(u => u.id !== userId));
      // Navigate back to users list after deletion
      setSelectedUser(null);
      setCurrentView('users');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(t('saveFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  const handleResendVerificationEmail = async (user: UserWithId) => {
    if (!user.email) return;
    
    setActionLoading('resend-' + user.id);
    try {
      const auth = getAuth();
      // Send a sign-in link that also verifies the email when clicked
      const actionCodeSettings = {
        url: window.location.origin + '/login?verified=true',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, user.email, actionCodeSettings);
      // Store the email for later verification
      window.localStorage.setItem('emailForSignIn', user.email);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      alert(
        language === 'zh' 
          ? '发送验证邮件失败: ' + error.message 
          : 'Failed to send verification email: ' + error.message
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div
        className={`bg-gray-900 w-full max-w-lg rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
        style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}
      >
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-3">
            {currentView !== 'menu' && (
              <button 
                onClick={goBack}
                className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex items-center gap-2">
              {currentView === 'menu' && <Shield size={20} className="text-purple-400" />}
              {currentView === 'users' && <Shield size={20} className="text-purple-400" />}
              {currentView === 'userDetail' && selectedUser?.role === 'admin' && (
                <Shield size={20} className="text-purple-400" />
              )}
              <h2 className="text-lg font-semibold text-white">
                {currentView === 'menu' && t('siteManagement')}
                {currentView === 'users' && t('userManagement')}
                {currentView === 'userDetail' && t('userManagement')}
              </h2>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll" style={{ scrollbarGutter: 'stable' }}>
          
          {/* Menu View */}
          {currentView === 'menu' && (
            <div className={`p-4 space-y-2 transition-all duration-300 ease-out ${
              isViewTransitioning
                ? transitionDirection === 'back'
                  ? 'opacity-0 translate-x-4'
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}>
              <button
                onClick={() => navigateTo('users')}
                className="w-full flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700 rounded-xl transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users size={20} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">{t('userManagement')}</p>
                    <p className="text-sm text-gray-400">{t('approveRejectUsers')}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition" />
              </button>
            </div>
          )}

          {/* User Management View */}
          {currentView === 'users' && (
            <div className={`p-4 transition-all duration-300 ease-out ${
              isViewTransitioning
                ? transitionDirection === 'forward'
                  ? 'opacity-0 translate-x-4'
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-blue-400 mb-3" />
                  <p className="text-gray-400">{t('loadingUsers')}</p>
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-center">
                    <p className="text-red-300 font-medium mb-2">{t('failedToLoad')}</p>
                    <p className="text-red-400/70 text-sm mb-4">{fetchError}</p>
                    <button
                      onClick={fetchUsers}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition text-sm"
                    >
                      {t('tryAgain')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Pending Users Section - Always show */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={16} className="text-yellow-400" />
                      <h3 className="text-sm font-medium text-yellow-400 uppercase tracking-wide">
                        {t('pendingUsers')} ({pendingUsers.length})
                      </h3>
                    </div>
                    {pendingUsers.length === 0 ? (
                      <div className="text-gray-500 text-center py-4 bg-gray-700/30 rounded-xl border border-dashed border-gray-600">
                        {t('noPendingUsers')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pendingUsers.map((user) => (
                          <button 
                            key={user.id}
                            onClick={() => navigateToUserDetail(user)}
                            className="w-full flex items-center justify-between p-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-xl transition group text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-white truncate">
                                  {user.displayName || user.email}
                                </p>
                                {!user.emailVerified && (
                                  <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertTriangle size={10} />
                                    {t('emailNotVerified')}
                                  </span>
                                )}
                                {user.emailVerified && (
                                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                                    {t('emailVerified')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                              <p className="text-xs text-gray-500">{t('joined')} {formatDate(user.createdAt)}</p>
                            </div>
                            <ChevronRight size={18} className="text-yellow-500/50 group-hover:text-yellow-400 transition ml-2" />
                                    <Check size={16} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Approved Users Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Check size={16} className="text-green-400" />
                      <h3 className="text-sm font-medium text-green-400 uppercase tracking-wide">
                        {t('approvedUsers')} ({approvedUsers.length})
                      </h3>
                    </div>
                    {approvedUsers.length === 0 ? (
                      <div className="text-gray-500 text-center py-4 bg-gray-700/30 rounded-xl border border-dashed border-gray-600">
                        {t('noApprovedUsers')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {approvedUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => navigateToUserDetail(user)}
                            className="w-full flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-xl transition group text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-white truncate">
                                  {user.displayName || user.email}
                                </p>
                                {user.role === 'admin' && (
                                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                                    {t('admin')}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate">{user.email}</p>
                              <p className="text-xs text-gray-500">{t('joined')} {formatDate(user.createdAt)}</p>
                            </div>
                            <ChevronRight size={18} className="text-gray-500 group-hover:text-white transition ml-2" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500 text-center">
                      {t('totalUsers')}: {users.length} • {t('pending')}: {pendingUsers.length} • {t('approved')}: {approvedUsers.length}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Detail View */}
          {currentView === 'userDetail' && selectedUser && (
            <div className={`p-4 transition-all duration-300 ease-out ${
              isViewTransitioning
                ? transitionDirection === 'forward'
                  ? 'opacity-0 translate-x-4'
                  : 'opacity-0 -translate-x-4'
                : 'opacity-100 translate-x-0'
            }`}>
              <div className="flex flex-col items-center">
                {/* Profile Picture */}
                <div className="mb-4 relative">
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt={selectedUser.displayName || 'User'}
                      className="w-20 h-20 rounded-full object-cover border-4 border-gray-600"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-700 border-4 border-gray-600 flex items-center justify-center">
                      <Users size={32} className="text-gray-500" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedUser.status === 'approved' 
                      ? 'bg-green-500 text-white' 
                      : selectedUser.status === 'pending'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-red-500 text-white'
                  }`}>
                    {selectedUser.status === 'approved' ? t('approved') : selectedUser.status === 'pending' ? t('pending') : t('rejected')}
                  </div>
                </div>

                {/* Success Message */}
                {resendSuccess && (
                  <div className="w-full mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300 text-sm text-center">
                    {language === 'zh' ? '验证邮件已发送！' : 'Verification email sent!'}
                  </div>
                )}

                {/* User Info */}
                <div className="w-full space-y-3">
                  {/* Display Name */}
                  <div className="bg-gray-700/50 rounded-xl p-3 border border-gray-600">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('displayName')}</p>
                    <p className="text-white font-medium">{selectedUser.displayName || '-'}</p>
                  </div>

                  {/* Email with Verification Status */}
                  <div className="bg-gray-700/50 rounded-xl p-3 border border-gray-600">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('email')}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Mail size={14} className="text-gray-400" />
                      <p className="text-white text-sm">{selectedUser.email}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {selectedUser.emailVerified ? (
                        <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full flex items-center gap-1">
                          <Check size={12} />
                          {t('emailVerified')}
                        </span>
                      ) : (
                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {t('emailNotVerified')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  <div className="bg-gray-700/50 rounded-xl p-3 border border-gray-600">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('role')}</p>
                    <div className="flex items-center gap-2">
                      {selectedUser.role === 'admin' ? (
                        <>
                          <Shield size={14} className="text-purple-400" />
                          <p className="text-purple-300 font-medium text-sm">{t('admin')}</p>
                        </>
                      ) : (
                        <>
                          <Users size={14} className="text-gray-400" />
                          <p className="text-white text-sm">{t('user')}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Joined Date */}
                  <div className="bg-gray-700/50 rounded-xl p-3 border border-gray-600">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('joined')}</p>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <p className="text-white text-sm">{formatDateTime(selectedUser.createdAt)}</p>
                    </div>
                  </div>

                  {/* User ID */}
                  <div className="bg-gray-700/50 rounded-xl p-3 border border-gray-600">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">User ID</p>
                    <p className="text-gray-300 text-xs font-mono break-all">{selectedUser.id}</p>
                  </div>

                  {/* Actions Section */}
                  <div className="pt-2 space-y-2">
                    {/* Resend Verification Email - Only for unverified users */}
                    {!selectedUser.emailVerified && (
                      <button
                        onClick={() => handleResendVerificationEmail(selectedUser)}
                        disabled={actionLoading === 'resend-' + selectedUser.id}
                        className="w-full flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 font-medium py-2.5 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === 'resend-' + selectedUser.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        {language === 'zh' ? '重新发送验证邮件' : 'Resend Verification Email'}
                      </button>
                    )}

                    {/* Approve/Override Button - Only for pending users */}
                    {selectedUser.status === 'pending' && (
                      <button
                        onClick={() => handleApproveUser(selectedUser.id, true)}
                        disabled={actionLoading === selectedUser.id}
                        className="w-full flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 font-medium py-2.5 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === selectedUser.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={16} />
                        )}
                        {!selectedUser.emailVerified 
                          ? (language === 'zh' ? '强制批准 (跳过验证)' : 'Force Approve (Skip Verification)')
                          : (language === 'zh' ? '批准用户' : 'Approve User')
                        }
                      </button>
                    )}

                    {/* Reject Button - Only for pending users */}
                    {selectedUser.status === 'pending' && (
                      <button
                        onClick={() => handleRejectUser(selectedUser.id)}
                        disabled={actionLoading === selectedUser.id}
                        className="w-full flex items-center justify-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 font-medium py-2.5 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XIcon size={16} />
                        {language === 'zh' ? '拒绝' : 'Reject'}
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteUser(selectedUser.id)}
                      disabled={actionLoading === selectedUser.id}
                      className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-medium py-2.5 px-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === selectedUser.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      {t('deleteUser')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
