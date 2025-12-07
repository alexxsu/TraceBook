import React, { useEffect, useState } from 'react';
import { Rss, Heart, MessageCircle, Share2, Clock, Image } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

type AnimationDirection = 'left' | 'right';

interface FeedsPageProps {
  isVisible: boolean;
  animationDirection: AnimationDirection;
  isAnimatingOut: boolean;
}

export const FeedsPage: React.FC<FeedsPageProps> = ({
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
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl border border-orange-400/20">
              <Rss size={24} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                {language === 'zh' ? '动态' : 'Feeds'}
              </h1>
              <p className="text-sm text-gray-400">
                {language === 'zh' ? '好友的最新动态' : 'Latest from your friends'}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ maxHeight: 'calc(100% - 85px)' }}>
          {/* Coming Soon Banner */}
          <div className="mt-6 mb-6 p-5 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl text-center">
            <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Clock size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {language === 'zh' ? '即将推出' : 'Coming Soon'}
            </h2>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              {language === 'zh' 
                ? '动态时间线正在开发中。您很快就可以在这里查看好友分享的地点和记忆。'
                : 'Timeline feature is under development. You\'ll soon see places and memories shared by your friends here.'
              }
            </p>
          </div>

          {/* Feature Preview Cards */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              {language === 'zh' ? '功能预览' : 'Feature Preview'}
            </h3>

            {/* Feature Cards */}
            <div className="space-y-3">
              <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-xl flex items-center gap-4 opacity-60">
                <div className="w-11 h-11 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full flex items-center justify-center">
                  <Image size={20} className="text-orange-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">
                    {language === 'zh' ? '照片时间线' : 'Photo Timeline'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {language === 'zh' ? '浏览好友分享的精彩瞬间' : 'Browse moments shared by friends'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-xl flex items-center gap-4 opacity-60">
                <div className="w-11 h-11 bg-gradient-to-br from-pink-500/30 to-rose-500/30 rounded-full flex items-center justify-center">
                  <Heart size={20} className="text-pink-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">
                    {language === 'zh' ? '点赞互动' : 'Like & Interact'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {language === 'zh' ? '为好友的帖子点赞' : 'Like your friends\' posts'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-xl flex items-center gap-4 opacity-60">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full flex items-center justify-center">
                  <MessageCircle size={20} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm">
                    {language === 'zh' ? '评论交流' : 'Comments'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {language === 'zh' ? '与好友互动评论' : 'Comment and chat with friends'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Skeleton Post Cards */}
          <div className="mt-5 space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {language === 'zh' ? '示例帖子' : 'Sample Posts'}
            </h3>
            
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="bg-gray-800/30 border border-gray-700/20 rounded-2xl overflow-hidden opacity-40"
              >
                {/* Post Header */}
                <div className="p-3.5 flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-700/50 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-20 bg-gray-700/50 rounded animate-pulse" />
                    <div className="h-2 w-14 bg-gray-700/30 rounded animate-pulse" />
                  </div>
                </div>
                
                {/* Post Image */}
                <div className="w-full aspect-[4/3] bg-gray-700/30 animate-pulse flex items-center justify-center">
                  <Image size={36} className="text-gray-600" />
                </div>
                
                {/* Post Actions */}
                <div className="p-3.5">
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-1.5">
                      <Heart size={18} className="text-gray-600" />
                      <div className="h-2.5 w-6 bg-gray-700/30 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle size={18} className="text-gray-600" />
                      <div className="h-2.5 w-5 bg-gray-700/30 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Share2 size={18} className="text-gray-600" />
                    </div>
                  </div>
                  
                  {/* Caption */}
                  <div className="mt-2.5 space-y-1.5">
                    <div className="h-2.5 w-full bg-gray-700/30 rounded animate-pulse" />
                    <div className="h-2.5 w-2/3 bg-gray-700/30 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedsPage;
