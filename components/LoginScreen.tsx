import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface LoginScreenProps {
  onLogin: () => void;
  onGuestLogin: () => void;
  onEmailLogin: (email: string, password: string) => Promise<{ needsVerification: boolean; needsApproval: boolean }>;
  onEmailSignUp: (email: string, password: string, displayName: string) => Promise<void>;
}

type AuthMode = 'initial' | 'signin' | 'signup';
type TransitionDirection = 'forward' | 'backward' | 'none';

// Breathing Logo Component
const BreathingLogo: React.FC = () => (
  <>
    <style>{`
      @keyframes breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.08); }
      }
      @keyframes glowPulse {
        0%, 100% { opacity: 0.4; transform: scale(0.9); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
      .breathing-logo {
        animation: breathe 4s ease-in-out infinite;
      }
      .logo-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 120%;
        height: 120%;
        background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.5) 0%, rgba(147, 51, 234, 0.3) 40%, transparent 70%);
        filter: blur(20px);
        animation: glowPulse 4s ease-in-out infinite;
        z-index: -1;
      }
    `}</style>
    <div className="relative flex justify-center mb-3 [@media(min-height:700px)]:mb-8">
      <div className="logo-glow" />
      <img 
        src="/logo.svg" 
        alt="TraceBook Logo" 
        className="breathing-logo w-16 h-16 [@media(min-height:700px)]:w-40 [@media(min-height:700px)]:h-40 object-contain drop-shadow-2xl relative z-10" 
      />
    </div>
  </>
);

// Animated Title Component - outline text with fill sweep effect
const AnimatedTitle: React.FC<{ text: string }> = ({ text }) => (
  <>
    <style>{`
      .animated-title {
        --border-right: 4px;
        --text-stroke-color: rgba(255,255,255,0.6);
        --animation-color: #60a5fa;
        position: relative;
        display: inline-block;
        color: transparent;
        -webkit-text-stroke: 1px var(--text-stroke-color);
        letter-spacing: 2px;
      }
      .animated-title .hover-text {
        position: absolute;
        box-sizing: border-box;
        color: var(--animation-color);
        width: 0%;
        inset: 0;
        border-right: var(--border-right) solid var(--animation-color);
        overflow: hidden;
        transition: 0.5s;
        -webkit-text-stroke: 1px var(--animation-color);
        white-space: nowrap;
      }
      .animated-title:hover .hover-text {
        width: 100%;
        filter: drop-shadow(0 0 23px var(--animation-color));
      }
      /* Mobile: auto-animate */
      @media (max-width: 768px) {
        @keyframes titleFill {
          0%, 10% { width: 0%; }
          40%, 60% { width: 100%; filter: drop-shadow(0 0 23px var(--animation-color)); }
          90%, 100% { width: 0%; }
        }
        .animated-title .hover-text {
          animation: titleFill 4s ease-in-out infinite;
        }
      }
    `}</style>
    <span className="animated-title">
      <span className="actual-text">{text}</span>
      <span aria-hidden="true" className="hover-text">{text}</span>
    </span>
  </>
);

// Earth Loader Component (inline for login screen)
const EarthLoader: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  
  return (
    <>
      <style>{`
        .login-earth-loader {
          --watercolor: #3344c1;
          --landcolor: #7cc133;
          width: 7.5em;
          height: 7.5em;
          background-color: var(--watercolor);
          position: relative;
          overflow: hidden;
          border-radius: 50%;
          box-shadow:
            inset 0em 0.5em rgb(255, 255, 255, 0.25),
            inset 0em -0.5em rgb(0, 0, 0, 0.25);
          border: solid 0.15em white;
          animation: login-startround 0.4s ease-out;
        }
        .login-earth-loader svg:nth-child(1) {
          position: absolute;
          bottom: -2em;
          width: 7em;
          height: auto;
          animation: login-round1 2.5s infinite linear 0.375s;
        }
        .login-earth-loader svg:nth-child(2) {
          position: absolute;
          top: -3em;
          width: 7em;
          height: auto;
          animation: login-round1 2.5s infinite linear;
        }
        .login-earth-loader svg:nth-child(3) {
          position: absolute;
          top: -2.5em;
          width: 7em;
          height: auto;
          animation: login-round2 2.5s infinite linear;
        }
        .login-earth-loader svg:nth-child(4) {
          position: absolute;
          bottom: -2.2em;
          width: 7em;
          height: auto;
          animation: login-round2 2.5s infinite linear 0.375s;
        }
        @keyframes login-startround {
          0% { filter: brightness(200%); transform: scale(0.8); }
          100% { filter: brightness(100%); transform: scale(1); }
        }
        @keyframes login-round1 {
          0% { left: -2em; opacity: 1; transform: skewX(0deg) rotate(0deg); }
          30% { left: -6em; opacity: 1; transform: skewX(-25deg) rotate(25deg); }
          31% { left: -6em; opacity: 0; transform: skewX(-25deg) rotate(25deg); }
          35% { left: 7em; opacity: 0; transform: skewX(25deg) rotate(-25deg); }
          45% { left: 7em; opacity: 1; transform: skewX(25deg) rotate(-25deg); }
          100% { left: -2em; opacity: 1; transform: skewX(0deg) rotate(0deg); }
        }
        @keyframes login-round2 {
          0% { left: 5em; opacity: 1; transform: skewX(0deg) rotate(0deg); }
          75% { left: -7em; opacity: 1; transform: skewX(-25deg) rotate(25deg); }
          76% { left: -7em; opacity: 0; transform: skewX(-25deg) rotate(25deg); }
          77% { left: 8em; opacity: 0; transform: skewX(25deg) rotate(-25deg); }
          80% { left: 8em; opacity: 1; transform: skewX(25deg) rotate(-25deg); }
          100% { left: 5em; opacity: 1; transform: skewX(0deg) rotate(0deg); }
        }
      `}</style>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/80 backdrop-blur-md">
        <div className="flex flex-col items-center">
          <div className="login-earth-loader">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
              <path transform="translate(100 100)" d="M29.4,-17.4C33.1,1.8,27.6,16.1,11.5,31.6C-4.7,47,-31.5,63.6,-43,56C-54.5,48.4,-50.7,16.6,-41,-10.9C-31.3,-38.4,-15.6,-61.5,-1.4,-61C12.8,-60.5,25.7,-36.5,29.4,-17.4Z" fill="#7CC133" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
              <path transform="translate(100 100)" d="M31.7,-55.8C40.3,-50,45.9,-39.9,49.7,-29.8C53.5,-19.8,55.5,-9.9,53.1,-1.4C50.6,7.1,43.6,14.1,41.8,27.6C40.1,41.1,43.4,61.1,37.3,67C31.2,72.9,15.6,64.8,1.5,62.2C-12.5,59.5,-25,62.3,-31.8,56.7C-38.5,51.1,-39.4,37.2,-49.3,26.3C-59.1,15.5,-78,7.7,-77.6,0.2C-77.2,-7.2,-57.4,-14.5,-49.3,-28.4C-41.2,-42.4,-44.7,-63,-38.5,-70.1C-32.2,-77.2,-16.1,-70.8,-2.3,-66.9C11.6,-63,23.1,-61.5,31.7,-55.8Z" fill="#7CC133" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
              <path transform="translate(100 100)" d="M30.6,-49.2C42.5,-46.1,57.1,-43.7,67.6,-35.7C78.1,-27.6,84.6,-13.8,80.3,-2.4C76.1,8.9,61.2,17.8,52.5,29.1C43.8,40.3,41.4,53.9,33.7,64C26,74.1,13,80.6,2.2,76.9C-8.6,73.1,-17.3,59,-30.6,52.1C-43.9,45.3,-61.9,45.7,-74.1,38.2C-86.4,30.7,-92.9,15.4,-88.6,2.5C-84.4,-10.5,-69.4,-20.9,-60.7,-34.6C-52.1,-48.3,-49.8,-65.3,-40.7,-70C-31.6,-74.8,-15.8,-67.4,-3.2,-61.8C9.3,-56.1,18.6,-52.3,30.6,-49.2Z" fill="#7CC133" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
              <path transform="translate(100 100)" d="M39.4,-66C48.6,-62.9,51.9,-47.4,52.9,-34.3C53.8,-21.3,52.4,-10.6,54.4,1.1C56.3,12.9,61.7,25.8,57.5,33.2C53.2,40.5,39.3,42.3,28.2,46C17,49.6,8.5,55.1,1.3,52.8C-5.9,50.5,-11.7,40.5,-23.6,37.2C-35.4,34,-53.3,37.5,-62,32.4C-70.7,27.4,-70.4,13.7,-72.4,-1.1C-74.3,-15.9,-78.6,-31.9,-73.3,-43C-68.1,-54.2,-53.3,-60.5,-39.5,-60.9C-25.7,-61.4,-12.9,-56,1.1,-58C15.1,-59.9,30.2,-69.2,39.4,-66Z" fill="#7CC133" />
            </svg>
          </div>
          <p className="text-white text-lg font-medium mt-3 drop-shadow-lg">Loading map</p>
        </div>
      </div>
    </>
  );
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  onLogin, 
  onGuestLogin, 
  onEmailLogin,
  onEmailSignUp 
}) => {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('initial');
  const [prevMode, setPrevMode] = useState<AuthMode>('initial');
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>('none');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showEarthLoader, setShowEarthLoader] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
    setSuccessMessage('');
  };

  const changeMode = (newMode: AuthMode, direction: TransitionDirection = 'forward') => {
    if (isTransitioning || newMode === mode) return;
    
    setPrevMode(mode);
    setTransitionDirection(direction);
    setIsTransitioning(true);
    
    // Small delay to allow exit animation to start, then switch mode
    requestAnimationFrame(() => {
      setTimeout(() => {
        setMode(newMode);
        resetForm();
        
        // Allow enter animation to complete
        setTimeout(() => {
          setIsTransitioning(false);
          setPrevMode(newMode);
          setTransitionDirection('none');
        }, 450);
      }, 250);
    });
  };

  const goBack = () => {
    changeMode('initial', 'backward');
  };

  const handleGoogleLogin = () => {
    setShowEarthLoader(true);
    setTimeout(() => {
      onLogin();
    }, 100);
  };

  const handleGuestLoginClick = () => {
    setShowEarthLoader(true);
    setTimeout(() => {
      onGuestLogin();
    }, 800);
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(language === 'zh' ? '请填写所有字段' : 'Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await onEmailLogin(email, password);
      if (!result.needsVerification && !result.needsApproval) {
        setShowEarthLoader(true);
      }
    } catch (err: any) {
      setError(err.message || t('loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError(language === 'zh' ? '请填写所有字段' : 'Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError(language === 'zh' ? '密码至少需要6个字符' : 'Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await onEmailSignUp(email, password, displayName);
      setSuccessMessage(language === 'zh' ? '账号创建成功！请查看邮箱验证您的账号。' : 'Account created! Please check your email to verify your account.');
      // After success, transition back to signin after a delay
      setTimeout(() => {
        changeMode('signin', 'backward');
      }, 2000);
    } catch (err: any) {
      setError(err.message || (language === 'zh' ? '注册失败' : 'Sign up failed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Get animation classes based on mode and transition state
  const getCardAnimationStyle = (cardMode: AuthMode) => {
    const isCurrentCard = mode === cardMode;
    const wasCurrentCard = prevMode === cardMode;
    const isExiting = wasCurrentCard && isTransitioning && !isCurrentCard;
    const isEntering = isCurrentCard && isTransitioning && !wasCurrentCard;
    
    // Base transition for all states
    const baseTransition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease-out';
    
    if (isExiting) {
      // Card is leaving
      const exitX = transitionDirection === 'forward' ? '-100%' : '100%';
      const exitRotate = transitionDirection === 'forward' ? '-8deg' : '8deg';
      return {
        transform: `translateX(${exitX}) scale(0.92) rotateY(${exitRotate})`,
        opacity: 0,
        transition: baseTransition,
        position: 'absolute' as const,
        inset: 0,
      };
    }
    
    if (isEntering) {
      // Card is entering - show it in final position (CSS transition handles the animation)
      return {
        transform: 'translateX(0) scale(1) rotateY(0deg)',
        opacity: 1,
        transition: baseTransition,
      };
    }
    
    if (isCurrentCard && !isTransitioning) {
      // Card is stationary and visible
      return {
        transform: 'translateX(0) scale(1) rotateY(0deg)',
        opacity: 1,
        transition: baseTransition,
      };
    }
    
    // Card is hidden (not current, not in transition)
    const hiddenX = transitionDirection === 'forward' ? '100%' : '-100%';
    return {
      transform: `translateX(${hiddenX}) scale(0.92)`,
      opacity: 0,
      pointerEvents: 'none' as const,
      position: 'absolute' as const,
      inset: 0,
      transition: 'none',
    };
  };

  // Background component
  const Background = () => (
    <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-64 h-64 [@media(min-height:700px)]:w-96 [@media(min-height:700px)]:h-96 bg-blue-600 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 [@media(min-height:700px)]:w-96 [@media(min-height:700px)]:h-96 bg-purple-600 rounded-full blur-[100px]" />
    </div>
  );

  return (
    <div className="flex flex-col items-center min-h-screen min-h-[100dvh] bg-gray-900 px-5 py-4 relative overflow-hidden" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 16px))', perspective: '1000px' }}>
      <Background />
      
      <EarthLoader visible={showEarthLoader} />

      {/* Card Container with perspective */}
      <div className="relative w-full max-w-md flex-1 flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
        
        {/* Initial Mode Card */}
        {(mode === 'initial' || (isTransitioning && prevMode === 'initial')) && (
          <div 
            className="bg-gray-800/80 backdrop-blur p-5 [@media(min-height:700px)]:p-8 rounded-2xl shadow-2xl w-full border border-gray-700 z-10 text-center"
            style={getCardAnimationStyle('initial')}
          >
            {/* Breathing Logo with Glow */}
            <BreathingLogo />

            <h1 className="text-xl [@media(min-height:700px)]:text-3xl font-bold text-white mb-1 [@media(min-height:700px)]:mb-2 tracking-tight">
              <AnimatedTitle text={t('appName')} />
            </h1>
            <p className="text-gray-400 mb-3 [@media(min-height:700px)]:mb-8 leading-relaxed text-xs [@media(min-height:700px)]:text-base">
              {language === 'zh' ? '记录你的美食足迹，与朋友实时分享。' : 'Trace your experiences. Share memories with friends in real-time.'}
            </p>

            {/* Informational Badge */}
            <div className="hidden [@media(min-height:700px)]:flex items-center justify-center gap-2 mb-6 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full mx-auto w-fit">
              <span className="text-blue-200 text-sm font-medium tracking-wide">
                {language === 'zh' ? '登录后可发布和编辑体验' : 'Log in to post and edit experiences'}
              </span>
            </div>

            {/* Google Sign In */}
            <div className="mb-2 [@media(min-height:700px)]:mb-4">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-2.5 [@media(min-height:700px)]:py-3 px-6 rounded-xl min-h-[44px] transition shadow-lg shadow-black/20 transform hover:scale-[1.02] active:scale-95 text-sm [@media(min-height:700px)]:text-base"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {language === 'zh' ? '使用 Google 登录' : 'Sign in with Google'}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2 [@media(min-height:700px)]:my-4">
              <div className="flex-1 h-px bg-gray-600"></div>
              <span className="text-gray-500 text-sm">{language === 'zh' ? '或' : 'or'}</span>
              <div className="flex-1 h-px bg-gray-600"></div>
            </div>

            {/* Email Sign In & Create Account */}
            <div className="space-y-2 [@media(min-height:700px)]:space-y-3 mb-2 [@media(min-height:700px)]:mb-4">
              <button
                onClick={() => changeMode('signin', 'forward')}
                className="w-full flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2.5 [@media(min-height:700px)]:py-3 px-6 rounded-xl min-h-[44px] transition shadow-lg shadow-black/20 transform hover:scale-[1.02] active:scale-95 text-sm [@media(min-height:700px)]:text-base"
              >
                <Mail className="w-5 h-5" />
                {language === 'zh' ? '使用邮箱登录' : 'Sign in with Email'}
              </button>

              <button
                onClick={() => changeMode('signup', 'forward')}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 [@media(min-height:700px)]:py-3 px-6 rounded-xl min-h-[44px] transition shadow-lg shadow-black/20 transform hover:scale-[1.02] active:scale-95 text-sm [@media(min-height:700px)]:text-base"
              >
                <User className="w-5 h-5" />
                {language === 'zh' ? '创建账号' : 'Create Account'}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-3 [@media(min-height:700px)]:my-5">
              <div className="flex-1 h-px bg-gray-600"></div>
              <span className="text-gray-500 text-xs">{language === 'zh' ? '或者先试试' : 'or try first'}</span>
              <div className="flex-1 h-px bg-gray-600"></div>
            </div>

            {/* Guest Mode - Subtle but inviting */}
            <button
              onClick={handleGuestLoginClick}
              className="w-full flex items-center justify-center gap-2 py-2.5 [@media(min-height:700px)]:py-3 px-6 rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-95 text-sm [@media(min-height:700px)]:text-base border border-gray-600 hover:border-gray-500 bg-gray-700/30 hover:bg-gray-700/50 text-gray-300 hover:text-white"
            >
              <Sparkles size={16} className="text-amber-400" />
              {language === 'zh' ? '游客模式体验' : 'Explore as Guest'}
            </button>
            
            {/* Helper text */}
            <p className="text-center text-gray-500 text-xs mt-2">
              {language === 'zh' ? '无需注册，立即体验' : 'No sign-up required'}
            </p>
          </div>
        )}

        {/* Sign In Mode Card */}
        {(mode === 'signin' || (isTransitioning && prevMode === 'signin')) && (
          <div 
            className="bg-gray-800/80 backdrop-blur p-5 [@media(min-height:700px)]:p-8 rounded-2xl shadow-2xl w-full border border-gray-700 z-10"
            style={getCardAnimationStyle('signin')}
          >
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4 [@media(min-height:700px)]:mb-6 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              {language === 'zh' ? '返回' : 'Back'}
            </button>

            <div className="text-center mb-4 [@media(min-height:700px)]:mb-8">
              <h1 className="text-xl [@media(min-height:700px)]:text-2xl font-bold text-white mb-1 [@media(min-height:700px)]:mb-2">{language === 'zh' ? '邮箱登录' : 'Sign in with Email'}</h1>
              <p className="text-gray-400 text-sm [@media(min-height:700px)]:text-base">{language === 'zh' ? '使用您的邮箱和密码登录' : 'Sign in with your email and password'}</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 [@media(min-height:700px)]:mb-6 text-sm animate-shake">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailSignIn} className="space-y-3 [@media(min-height:700px)]:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('email')}</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('password')}</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-3 px-6 rounded-xl min-h-[44px] transition shadow-lg shadow-blue-900/20 transform hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading && <Loader2 size={18} className="animate-spin" />}
                {isLoading ? (language === 'zh' ? '登录中...' : 'Signing in...') : t('login')}
              </button>
            </form>

            <p className="mt-4 [@media(min-height:700px)]:mt-6 text-center text-gray-400 text-sm">
              {t('noAccount')}{' '}
              <button 
                onClick={() => changeMode('signup', 'forward')}
                className="text-blue-400 hover:text-blue-300 transition"
              >
                {language === 'zh' ? '创建账号' : 'Create one'}
              </button>
            </p>
          </div>
        )}

        {/* Sign Up Mode Card */}
        {(mode === 'signup' || (isTransitioning && prevMode === 'signup')) && (
          <div 
            className="bg-gray-800/80 backdrop-blur p-5 [@media(min-height:700px)]:p-8 rounded-2xl shadow-2xl w-full border border-gray-700 z-10"
            style={getCardAnimationStyle('signup')}
          >
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-4 [@media(min-height:700px)]:mb-6 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              {language === 'zh' ? '返回' : 'Back'}
            </button>

            <div className="text-center mb-4 [@media(min-height:700px)]:mb-8">
              <h1 className="text-xl [@media(min-height:700px)]:text-2xl font-bold text-white mb-1 [@media(min-height:700px)]:mb-2">{language === 'zh' ? '创建账号' : 'Create Account'}</h1>
              <p className="text-gray-400 text-sm [@media(min-height:700px)]:text-base">{language === 'zh' ? '加入 TraceBook 开始记录你的美食足迹' : 'Join TraceBook to start mapping your experiences'}</p>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl mb-4 [@media(min-height:700px)]:mb-6 text-sm animate-shake">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-xl mb-4 [@media(min-height:700px)]:mb-6 text-sm">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleEmailSignUp} className="space-y-3 [@media(min-height:700px)]:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('displayName')}</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={language === 'zh' ? '你的名字' : 'Your name'}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('email')}</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('password')}</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={language === 'zh' ? '至少6个字符' : 'At least 6 characters'}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 px-4 py-3 rounded-xl text-sm text-yellow-200">
                <p>{language === 'zh' ? '注册后：' : 'After signing up:'}</p>
                <ul className="list-disc list-inside mt-1 text-yellow-300/80 space-y-1">
                  <li>{language === 'zh' ? '验证你的邮箱地址' : 'Verify your email address'}</li>
                  <li>{language === 'zh' ? '等待管理员审核' : 'Wait for admin approval'}</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold py-3 px-6 rounded-xl min-h-[44px] transition shadow-lg shadow-blue-900/20 transform hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading && <Loader2 size={18} className="animate-spin" />}
                {isLoading ? (language === 'zh' ? '创建中...' : 'Creating account...') : (language === 'zh' ? '创建账号' : 'Create Account')}
              </button>
            </form>

            <p className="mt-4 [@media(min-height:700px)]:mt-6 text-center text-gray-400 text-sm">
              {t('hasAccount')}{' '}
              <button 
                onClick={() => changeMode('signin', 'backward')}
                className="text-blue-400 hover:text-blue-300 transition"
              >
                {t('login')}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
