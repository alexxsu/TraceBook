import React from 'react';
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

  if (!isVisible && !isAnimatingIn) return null;

  return (
    <div 
      className={`fixed inset-0 z-40 bg-gray-900 transition-all duration-400 ease-out ${
        isAnimatingIn 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-full pointer-events-none'
      }`}
      style={{
        transition: 'opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)'
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 px-4 py-4 pt-safe">
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
      <div className="flex-1 overflow-y-auto pb-28 px-4">
        {/* Coming Soon Banner */}
        <div className="mt-8 mb-8 p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl text-center">
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
  );
};

export default FeedsPage;
