import React, { useState } from 'react';
import { X, MapPin, Camera, Sparkles, ChevronRight, ChevronDown, HelpCircle, Info } from 'lucide-react';
import { GRADES, getGradeColor, getGradeDescription } from '../utils/rating';
import { useLanguage } from '../hooks/useLanguage';

interface InfoModalProps {
  onClose: () => void;
}

const APP_VERSION = '0.3.0';

interface VersionNote {
  version: string;
  date: string;
  title: string;
  titleZh: string;
  notes: string[];
  notesZh: string[];
}

const VERSION_HISTORY: VersionNote[] = [
  {
    version: '0.3.0',
    date: '2026-01',
    title: 'Mapbox Era',
    titleZh: 'Mapbox æ—¶ä»£',
    notes: [
      'Switched map provider from Google Maps to Mapbox GL',
      'Improved marker/cluster stability and layering',
      'Desktop right-click drag now adjusts map tilt/rotation',
      'Friendlier errors when Foursquare autocomplete lacks an API key'
    ],
    notesZh: [
      'å°†åœ°å›¾æä¾›å•†ä»Ž Google Maps åˆ‡æ¢åˆ° Mapbox GL',
      'æ ‡è®°/èšåˆç¨³å®šæ€§å’Œå±‚çº§æ´ä¼˜',
      'æ¡Œé¢å³é”®æ‹–æ‹½å¯è°ƒæ•´åœ°å›¾æŠ˜å æœä½œç’°',
      'Foursquare æœç´¢åœ°æœå­˜åœ¨ API key æ—¶çš„é”™è¯¯æ›´å‹å¥½'
    ]
  },
  {
    version: '0.2.0',
    date: '2025-12',
    title: 'Enhanced User Experience',
    titleZh: '增强用户体验',
    notes: [
      'Improved animations throughout the app',
      'Collapsible sections in About panel',
      'Smoother cluster transitions on map',
      'Enhanced mobile experience',
      'Guest user search improvements'
    ],
    notesZh: [
      '改进全应用动画效果',
      '关于面板可折叠部分',
      '更平滑的地图聚合过渡',
      '增强移动端体验',
      '游客用户搜索改进'
    ]
  },
  {
    version: '0.1.0',
    date: '2025-12',
    title: 'First Official Release',
    titleZh: '首个正式版本',
    notes: [
      'Official release of TraceBook',
      'Interactive map for tracking food experiences',
      'Photo upload with GPS location detection',
      'Grade-based rating system (S-E)',
      'Private and shared maps support',
      'Multi-language support (English/Chinese)',
      'Interactive tutorial for new users',
      'Filter and search functionality',
      'Statistics and history views'
    ],
    notesZh: [
      'TraceBook 正式发布',
      '交互式地图记录美食体验',
      '照片上传自动检测GPS位置',
      '等级评分系统 (S-E)',
      '支持私人和共享地图',
      '多语言支持 (中文/英文)',
      '新用户交互式教程',
      '筛选和搜索功能',
      '统计和历史记录视图'
    ]
  }
];

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  icon, 
  defaultOpen = false, 
  children 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden transition-all duration-300">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-700/30 transition-colors duration-200"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-white font-bold">{title}</h3>
        </div>
        <ChevronDown 
          size={20} 
          className={`text-gray-400 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : 'rotate-0'}`} 
        />
      </button>
      <div 
        className={`transition-all duration-300 ease-out overflow-hidden ${
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        style={{
          transitionProperty: 'max-height, opacity, padding',
        }}
      >
        <div className="mx-4 border-t border-gray-700/50"></div>
        <div className={`px-4 pt-4 pb-4 transition-all duration-200 ${isOpen ? 'translate-y-0' : '-translate-y-2'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

const InfoModal: React.FC<InfoModalProps> = ({ onClose }) => {
  const { t, language } = useLanguage();
  const [isClosing, setIsClosing] = useState(false);
  const [showVersionNotes, setShowVersionNotes] = useState(false);
  const [isVersionClosing, setIsVersionClosing] = useState(false);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const handleVersionClose = () => {
    setIsVersionClosing(true);
    setTimeout(() => {
      setShowVersionNotes(false);
      setIsVersionClosing(false);
    }, 200);
  };

  const handleVersionOpen = () => {
    setShowVersionNotes(true);
  };

  // Get translated grade description
  const getTranslatedGradeDesc = (grade: string) => {
    const gradeDescKeys: Record<string, string> = {
      'S': 'gradeSDesc',
      'A': 'gradeADesc',
      'B': 'gradeBDesc',
      'C': 'gradeCDesc',
      'D': 'gradeDDesc',
      'E': 'gradeEDesc',
    };
    return t(gradeDescKeys[grade] as any) || getGradeDescription(grade);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-gray-900 w-full max-w-lg rounded-3xl border border-gray-700/50 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-all duration-300 ease-out ${isClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0 animate-scale-in'}`}
        style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">{t('aboutTitle')}</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-all duration-200">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* How to Use Section - Collapsible */}
          <CollapsibleSection 
            title={t('howToUse')} 
            icon={<HelpCircle size={18} className="text-blue-400" />}
            defaultOpen={false}
          >
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex gap-2">
                <Camera size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <span>{language === 'zh' ? '上传照片，应用会自动从GPS数据检测位置。' : 'Upload photos. The app auto-detects the location from GPS data.'}</span>
              </li>
              <li className="flex gap-2">
                <MapPin size={18} className="text-green-400 flex-shrink-0 mt-0.5" />
                <span>{language === 'zh' ? '体验会被标记在地图上。点击聚合点可以放大查看。' : 'Experiences are pinned to the map. Click clusters to zoom in.'}</span>
              </li>
            </ul>
          </CollapsibleSection>

          {/* Rating System Section - Collapsible */}
          <CollapsibleSection 
            title={language === 'zh' ? '评分系统' : 'Rating System'}
            icon={<Sparkles size={18} className="text-amber-400" />}
            defaultOpen={false}
          >
            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-3">
                {language === 'zh' 
                  ? '我们的评分系统使用 S 到 E 的等级来评价您的美食体验：'
                  : 'Our rating system uses grades from S to E to rate your food experiences:'}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {GRADES.map((grade, index) => (
                  <div 
                    key={grade} 
                    className="flex items-center gap-3 bg-gray-900/50 p-3 rounded-lg border border-gray-800 transition-all duration-200 hover:border-gray-700 hover:bg-gray-800/50"
                    style={{ 
                      animationDelay: `${index * 50}ms`,
                    }}
                  >
                    <span className={`font-bold w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 ${getGradeColor(grade)}`}>{grade}</span>
                    <span className="text-sm text-gray-300 flex-1">{getTranslatedGradeDesc(grade)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          {/* App Info Section - Collapsible */}
          <CollapsibleSection 
            title={language === 'zh' ? '应用信息' : 'App Info'}
            icon={<Info size={18} className="text-green-400" />}
            defaultOpen={false}
          >
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                <span className="text-gray-400">{language === 'zh' ? '版本' : 'Version'}</span>
                <span className="font-medium text-white">{APP_VERSION}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                <span className="text-gray-400">{language === 'zh' ? '最后更新' : 'Last Updated'}</span>
                <span className="font-medium text-white">December 2025</span>
              </div>
              <button
                onClick={handleVersionOpen}
                className="w-full mt-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <span>{language === 'zh' ? '查看版本历史' : 'View Version History'}</span>
                <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* Version Notes Modal */}
      {showVersionNotes && (
        <div 
          className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-opacity duration-200 ${isVersionClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={handleVersionClose}
        >
          <div 
            className={`bg-gray-800 w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all duration-300 ease-out ${isVersionClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0 animate-scale-in'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-900/50 to-purple-900/50">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-blue-400" />
                <h2 className="text-lg font-semibold text-white">{language === 'zh' ? '版本更新记录' : 'Version History'}</h2>
              </div>
              <button 
                onClick={handleVersionClose} 
                className="p-1 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-all duration-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {VERSION_HISTORY.map((release, releaseIndex) => (
                <div 
                  key={release.version} 
                  className="bg-gray-700/40 rounded-xl p-4 border border-gray-600 transition-all duration-300"
                  style={{ animationDelay: `${releaseIndex * 100}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-sm font-bold rounded-lg">
                        v{release.version}
                      </span>
                      <span className="text-xs text-gray-500">{release.date}</span>
                    </div>
                  </div>
                  <h3 className="text-white font-medium mb-2">
                    {language === 'zh' ? release.titleZh : release.title}
                  </h3>
                  <ul className="space-y-1.5">
                    {(language === 'zh' ? release.notesZh : release.notes).map((note, idx) => (
                      <li key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900/50">
              <button
                onClick={handleVersionClose}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200"
              >
                {language === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoModal;
