import React, { useEffect, useState } from 'react';
import { Rss, Heart, MessageCircle, Share2, Clock, Image } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface FeedsPageProps {
  isVisible: boolean;
  isAnimatingIn: boolean;
}

export const FeedsPage: React.FC<FeedsPageProps> = ({
  isVisible,
  isAnimatingIn
}) => {
  const { language } = useLanguage();
  const [shouldRender, setShouldRender] = useState(false);
  const [animationState, setAnimationState] = useState<'entering' | 'visible' | 'exiting' | 'hidden'>('hidden');

  useEffect(() => {
    if (isVisible && isAnimatingIn) {
      // Entering
      setShouldRender(true);
      setAnimationState('entering');
      const timer = setTimeout(() => setAnimationState('visible'), 50);
      return () => clearTimeout(timer);
    } else if (isVisible && !isAnimatingIn) {
      // Staying visible
      setShouldRender(true);
      setAnimationState('visible');
    } else if (!isVisible && shouldRender) {
      // Exiting
      setAnimationState('exiting');
      const timer = setTimeout(() => {
        setShouldRender(false);
        setAnimationState('hidden');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isAnimatingIn, shouldRender]);

  if (!shouldRender) return null;

  // Animation styles based on state - Feeds swipes RIGHT (opposite of Friends)
  const getAnimationStyle = () => {
    switch (animationState) {
      case 'entering':
        return {
          transform: 'translateX(100%) rotate(8deg) scale(0.95)',
          opacity: 0,
        };
      case 'visible':
        return {
          transform: 'translateX(0) rotate(0deg) scale(1)',
          opacity: 1,
        };
      case 'exiting':
        return {
          transform: 'translateX(120%) translateY(5%) rotate(12deg) scale(0.9)',
          opacity: 0,
        };
      default:
        return {
          transform: 'translateX(100%) rotate(8deg) scale(0.95)',
          opacity: 0,
        };
    }
  };

  const animStyle = getAnimationStyle();
  const isExiting = animationState === 'exiting';

  return (
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center p-3 pointer-events-none"
    >
      {/* Realistic blurred satellite map background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            /* Ocean/water areas - deep blues */
            radial-gradient(ellipse 80% 50% at 15% 85%, rgba(20, 50, 90, 0.9) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 75% 20%, rgba(25, 60, 100, 0.8) 0%, transparent 45%),
            radial-gradient(ellipse 50% 30% at 90% 70%, rgba(18, 45, 85, 0.7) 0%, transparent 40%),
            
            /* Land masses - greens and browns */
            radial-gradient(ellipse 70% 60% at 40% 30%, rgba(34, 85, 45, 0.85) 0%, transparent 40%),
            radial-gradient(ellipse 55% 45% at 60% 55%, rgba(45, 75, 35, 0.8) 0%, transparent 35%),
            radial-gradient(ellipse 40% 35% at 25% 60%, rgba(55, 90, 50, 0.7) 0%, transparent 30%),
            radial-gradient(ellipse 45% 40% at 70% 40%, rgba(40, 70, 40, 0.75) 0%, transparent 35%),
            
            /* Desert/dry areas - tans and browns */
            radial-gradient(ellipse 35% 30% at 50% 45%, rgba(120, 100, 70, 0.5) 0%, transparent 40%),
            radial-gradient(ellipse 25% 20% at 35% 35%, rgba(100, 85, 60, 0.4) 0%, transparent 35%),
            
            /* Mountain shadows - darker patches */
            radial-gradient(ellipse 20% 15% at 45% 50%, rgba(30, 45, 30, 0.6) 0%, transparent 50%),
            radial-gradient(ellipse 15% 20% at 65% 35%, rgba(25, 40, 28, 0.5) 0%, transparent 45%),
            
            /* Cloud hints - subtle white patches */
            radial-gradient(ellipse 30% 20% at 80% 25%, rgba(200, 210, 220, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 25% 15% at 20% 45%, rgba(190, 200, 210, 0.1) 0%, transparent 45%),
            
            /* Base layer - deep earth tone */
            linear-gradient(160deg, #1a2d1a 0%, #152818 25%, #0d1f1a 50%, #142030 75%, #0f1a25 100%)
          `,
          filter: 'blur(2px) saturate(1.1)',
        }}
      />
      
      {/* Subtle texture overlay for realism */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 0%, transparent 2%),
            radial-gradient(circle at 60% 70%, rgba(255,255,255,0.02) 0%, transparent 1.5%),
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.025) 0%, transparent 1.8%),
            radial-gradient(circle at 40% 80%, rgba(255,255,255,0.02) 0%, transparent 1.2%)
          `,
          backgroundSize: '100px 100px',
        }}
      />
      
      {/* Card Container */}
      <div 
        className="relative w-full h-full max-w-lg pointer-events-auto overflow-hidden"
        style={{
          ...animStyle,
          transition: isExiting
            ? 'transform 0.4s cubic-bezier(0.4, 0, 0.9, 0.4), opacity 0.35s ease-in'
            : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease-out',
          transformOrigin: 'right center',
          borderRadius: '24px',
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50 px-4 py-4">
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
        <div className="flex-1 overflow-y-auto pb-28 px-4" style={{ maxHeight: 'calc(100% - 80px)' }}>
          {/* Coming Soon Banner */}
          <div className="mt-6 mb-6 p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Clock size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
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
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full flex items-center justify-center">
                  <Image size={22} className="text-orange-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">
                    {language === 'zh' ? '照片时间线' : 'Photo Timeline'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {language === 'zh' ? '浏览好友分享的精彩瞬间' : 'Browse moments shared by friends'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-xl flex items-center gap-4 opacity-60">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500/30 to-rose-500/30 rounded-full flex items-center justify-center">
                  <Heart size={22} className="text-pink-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">
                    {language === 'zh' ? '点赞互动' : 'Like & Interact'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {language === 'zh' ? '为好友的帖子点赞' : 'Like your friends\' posts'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 border border-gray-700/30 rounded-xl flex items-center gap-4 opacity-60">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full flex items-center justify-center">
                  <MessageCircle size={22} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-medium">
                    {language === 'zh' ? '评论交流' : 'Comments'}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {language === 'zh' ? '与好友互动评论' : 'Comment and chat with friends'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Skeleton Post Cards */}
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {language === 'zh' ? '示例帖子' : 'Sample Posts'}
            </h3>
            
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="bg-gray-800/30 border border-gray-700/20 rounded-2xl overflow-hidden opacity-40"
              >
                {/* Post Header */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700/50 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-24 bg-gray-700/50 rounded animate-pulse" />
                    <div className="h-2.5 w-16 bg-gray-700/30 rounded animate-pulse" />
                  </div>
                </div>
                
                {/* Post Image */}
                <div className="w-full aspect-[4/3] bg-gray-700/30 animate-pulse flex items-center justify-center">
                  <Image size={40} className="text-gray-600" />
                </div>
                
                {/* Post Actions */}
                <div className="p-4">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Heart size={20} className="text-gray-600" />
                      <div className="h-3 w-8 bg-gray-700/30 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageCircle size={20} className="text-gray-600" />
                      <div className="h-3 w-6 bg-gray-700/30 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Share2 size={20} className="text-gray-600" />
                    </div>
                  </div>
                  
                  {/* Caption */}
                  <div className="mt-3 space-y-1.5">
                    <div className="h-3 w-full bg-gray-700/30 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-gray-700/30 rounded animate-pulse" />
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
