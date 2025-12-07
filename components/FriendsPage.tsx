import React, { useEffect, useState } from 'react';
import { Users, Search, UserPlus, Clock } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

type AnimationDirection = 'left' | 'right';

interface FriendsPageProps {
  isVisible: boolean;
  animationDirection: AnimationDirection;
  isAnimatingOut: boolean;
}

export const FriendsPage: React.FC<FriendsPageProps> = ({
  isVisible,
  animationDirection,
  isAnimatingOut
}) => {
  const { language } = useLanguage();
  const [shouldRender, setShouldRender] = useState(false);
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isVisible && !isAnimatingOut) {
      setShouldRender(true);
      // Animate in from the appropriate direction
      setAnimationClass(animationDirection === 'left' ? 'animate-card-in-left' : 'animate-card-in-right');
    } else if (isAnimatingOut) {
      // Animate out to the appropriate direction
      setAnimationClass(animationDirection === 'left' ? 'animate-card-out-left' : 'animate-card-out-right');
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    } else if (!isVisible) {
      setShouldRender(false);
    }
  }, [isVisible, isAnimatingOut, animationDirection]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pt-safe pb-28 pointer-events-none">
      {/* Card Container */}
      <div 
        className={`w-full h-full max-w-lg bg-gray-900 rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden pointer-events-auto ${animationClass}`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 px-5 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl border border-purple-400/20">
              <Users size={24} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {language === 'zh' ? '好友' : 'Friends'}
              </h1>
              <p className="text-sm text-gray-400">
                {language === 'zh' ? '管理您的好友列表' : 'Manage your friends list'}
              </p>
            </div>
          </div>

          {/* Search Bar Skeleton */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <div className="w-full h-11 bg-gray-800/50 border border-gray-700/50 rounded-xl pl-10" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ maxHeight: 'calc(100% - 130px)' }}>
          {/* Coming Soon Banner */}
          <div className="mt-6 mb-6 p-5 bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Clock size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {language === 'zh' ? '即将推出' : 'Coming Soon'}
            </h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              {language === 'zh' 
                ? '好友功能正在开发中。您很快就可以在这里添加、搜索和管理好友。'
                : 'Friends feature is under development. You\'ll soon be able to add, search, and manage friends here.'
              }
            </p>
          </div>

          {/* Placeholder Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                {language === 'zh' ? '功能预览' : 'Feature Preview'}
              </h3>
            </div>

            {/* Feature Cards */}
            <div className="space-y-3">
              <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-xl flex items-center gap-4 opacity-60">
                <div className="w-11 h-11 bg-gradient-to-br from-purple-500/30 to-violet-500/30 rounded-full flex items-center justify-center">
                  <UserPlus size={20} className="text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">
                    {language === 'zh' ? '添加好友' : 'Add Friends'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {language === 'zh' ? '通过用户名或邀请码添加' : 'Add via username or invite code'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-xl flex items-center gap-4 opacity-60">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-full flex items-center justify-center">
                  <Search size={20} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">
                    {language === 'zh' ? '搜索好友' : 'Search Friends'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {language === 'zh' ? '快速找到您的好友' : 'Quickly find your friends'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-xl flex items-center gap-4 opacity-60">
                <div className="w-11 h-11 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-full flex items-center justify-center">
                  <Users size={20} className="text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">
                    {language === 'zh' ? '好友列表' : 'Friends List'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {language === 'zh' ? '管理您的所有好友' : 'Manage all your friends'}
                  </p>
                </div>
              </div>
            </div>

            {/* Skeleton Friend Cards */}
            <div className="mt-5 space-y-3">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {language === 'zh' ? '示例好友' : 'Sample Friends'}
              </h3>
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="p-3.5 bg-gray-800/30 border border-gray-700/20 rounded-xl flex items-center gap-3 opacity-40"
                >
                  <div className="w-10 h-10 bg-gray-700/50 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-20 bg-gray-700/50 rounded animate-pulse" />
                    <div className="h-2.5 w-28 bg-gray-700/30 rounded animate-pulse" />
                  </div>
                  <div className="w-14 h-7 bg-gray-700/30 rounded-lg animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;
