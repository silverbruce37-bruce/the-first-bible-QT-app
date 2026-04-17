import React, { useState, useMemo, useEffect } from 'react';
import { getDailyReading } from './constants';
import { ActiveTab, DailyReading } from './types';
import BibleReading from './components/BibleReading';
import FaithDiary from './components/FaithDiary';
import EvangelismMission from './components/EvangelismMission';
import { useLanguage } from './i18n';
import Spinner from './components/common/Spinner';
import ErrorBoundary from './components/ErrorBoundary';
import DebugInfo from './components/DebugInfo';

// FIX: Moved the AIStudio interface inside `declare global` to resolve a TypeScript error
// about subsequent property declarations having different types. This ensures a single,
// globally-scoped definition for AIStudio and prevents module scope conflicts.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

const App: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('reading');
  const [passage, setPassage] = useState<string>('');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
        console.log('Starting API key check...');
        setIsCheckingApiKey(true);
        setAppError(null);
        
        // Add a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            console.log('API key check timeout, falling back to env variable');
            const envKey = import.meta.env.VITE_GEMINI_API_KEY;
            setApiKeySelected(!!envKey);
            setIsCheckingApiKey(false);
            if (!envKey) {
                setAppError('API 키를 찾을 수 없습니다. 환경변수를 확인해주세요.');
            }
        }, 5000); // 5 second timeout
        
        try {
            // Check for Vite environment variable first (for Vercel deployment)
            console.log('Checking environment variable...');
            console.log('All environment variables:', import.meta.env);
            let envKey: string | undefined;
            try {
                envKey = import.meta.env.VITE_GEMINI_API_KEY;
            } catch (envError) {
                console.warn('Error accessing environment variables:', envError);
                envKey = undefined;
            }
            console.log('Environment key exists:', !!envKey);
            console.log('Environment key length:', envKey?.length);
            
            if (envKey && envKey.trim() !== '') {
                console.log('Environment API key found');
                clearTimeout(timeoutId);
                setApiKeySelected(true);
                setIsCheckingApiKey(false);
                return;
            }
            
            // Check if running in AI Studio environment (fallback)
            console.log('Checking AI Studio...');
            if (window.aistudio) {
                console.log('AI Studio found, checking for API key...');
                const hasKey = await Promise.race([
                    window.aistudio.hasSelectedApiKey(),
                    new Promise(resolve => setTimeout(() => resolve(false), 3000))
                ]);
                if (hasKey) {
                    console.log('AI Studio API key found');
                    clearTimeout(timeoutId);
                    setApiKeySelected(true);
                    setIsCheckingApiKey(false);
                    return;
                }
            }
            
            console.log('No API key found, showing selection screen');
            clearTimeout(timeoutId);
            setApiKeySelected(false);
            setIsCheckingApiKey(false);
        } catch (error) {
            console.error('Error checking API key:', error);
            clearTimeout(timeoutId);
            // If there's an error, check for environment variable as fallback
            const envKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (envKey) {
                console.log('Fallback: Environment API key found');
                setApiKeySelected(true);
            } else {
                console.log('Fallback: No API key found');
                setApiKeySelected(false);
                setAppError('API 키 확인 중 오류가 발생했습니다.');
            }
            setIsCheckingApiKey(false);
        }
        
        console.log('API key check complete');
    };
    
    checkApiKey();
  }, []);

  const handleSelectApiKey = async () => {
      if (window.aistudio) {
          await window.aistudio.openSelectKey();
          // Assume key selection is successful and re-render the app
          setApiKeySelected(true);
      }
  };

  const today = new Date();
  let dailyReading: DailyReading;
  let todayDateString: string;
  let readingRef: string;
  let storageKey: string;

  try {
    dailyReading = getDailyReading(today, language);
    
    todayDateString = today.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
    
    readingRef = `${dailyReading[0].book} ${dailyReading[0].chapter}-${dailyReading[1].chapter}${language === 'ko' ? '장' : ''}`;
    storageKey = today.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch (error) {
    console.error('Error initializing app data:', error);
    setAppError('앱 초기화 중 오류가 발생했습니다.');
    return null;
  }

  useEffect(() => {
    try {
      document.documentElement.lang = language;
      document.title = t('appName');
    } catch (error) {
      console.error('Error setting document properties:', error);
    }
  }, [language, t]);

  const NavButton = ({ tab, label }: { tab: ActiveTab; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 py-3 px-2 text-sm md:text-base font-semibold transition-all duration-300 rounded-t-xl overflow-hidden relative group ${
        activeTab === tab 
          ? 'bg-white/90 text-emerald-700 shadow-[0_-4px_20px_-5px_rgba(20,160,144,0.15)] border-t-2 border-emerald-400 border-x border-white/50 backdrop-blur transform -translate-y-1' 
          : 'bg-emerald-50/30 text-emerald-700/60 hover:bg-emerald-50/80 hover:text-emerald-700 hover:-translate-y-0.5'
      }`}
    >
      <span className="relative z-10">{label}</span>
      {activeTab !== tab && <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );

  const LanguageButton = ({ lang, label }: { lang: 'ko' | 'en', label: string }) => (
    <button
      onClick={() => setLanguage(lang)}
      className={`px-3 py-1 text-xs rounded-md transition-colors ${
        language === lang ? 'bg-emerald-100 text-emerald-800 font-bold shadow-sm' : 'bg-transparent text-emerald-600 hover:bg-emerald-50'
      }`}
    >
      {label}
    </button>
  );

  // Show error state if there's an app error
  if (appError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center text-slate-300 p-4">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold text-red-400 mb-4">오류 발생</h1>
          <p className="mb-6">{appError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors mr-4"
          >
            새로고침
          </button>
          <button
            onClick={() => setAppError(null)}
            className="px-6 py-3 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-rose-50 font-sans text-stone-700 transition-colors duration-500">
      <header className="bg-white/70 backdrop-blur-xl text-emerald-900 shadow-sm border-b border-white/50 sticky top-0 z-20">
        <div className="container mx-auto px-4 pt-4 pb-2 text-center relative">
          <div className="absolute top-3 left-4">
            <span className="font-bold text-emerald-800 tracking-widest text-sm uppercase opacity-90">Live in Wonder</span>
          </div>
          <div className="absolute top-2 right-2 flex space-x-1 border border-emerald-200 rounded-lg p-0.5 bg-white/50">
            <LanguageButton lang="ko" label={t('korean')} />
            <LanguageButton lang="en" label={t('english')} />
          </div>
          <p className="text-sm md:text-base text-emerald-600/80 font-medium tracking-wide">{t('headerSubtitle')}</p>
          <h1 className="text-4xl md:text-5xl font-extrabold mt-1 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-emerald-500 to-rose-500 drop-shadow-sm animate-pulse-soft">{t('headerTitle')}</h1>
          <p className="mt-4 text-emerald-700 font-medium">{todayDateString}</p>
          <p className="mt-1 font-semibold text-lg text-rose-500">{t('todaysWord')}: {readingRef}</p>
        </div>
        <nav className="container mx-auto px-2 md:px-4 flex justify-around mt-4">
          <NavButton tab="reading" label={t('navReading')} />
          <NavButton tab="diary" label={t('navDiary')} />
          <NavButton tab="mission" label={t('navMission')} />
        </nav>
      </header>

      <main className="container mx-auto p-4 md:p-6 mb-8 animate-fade-in">
        {activeTab === 'reading' && (
          <ErrorBoundary>
            <BibleReading reading={dailyReading} onPassageLoaded={setPassage} />
          </ErrorBoundary>
        )}
        {activeTab === 'diary' && (
          <ErrorBoundary>
            <FaithDiary storageKey={`diary-${storageKey}`} />
          </ErrorBoundary>
        )}
        {activeTab === 'mission' && (
          <ErrorBoundary>
            {passage ? (
              <EvangelismMission passage={passage} storageKey={`mission-${storageKey}`}/>
            ) : (
              <div className="text-center p-8 bg-white/80 rounded-2xl shadow-sm text-stone-500 font-medium">{t('readingFirst')}</div>
            )}
          </ErrorBoundary>
        )}
      </main>

      <footer className="text-center py-8 text-emerald-700/60 font-medium text-sm border-t border-emerald-100/50 mt-12 bg-white/30 backdrop-blur-sm">
        <p>{t('footer', { year: new Date().getFullYear() })}</p>
      </footer>
      <DebugInfo />
    </div>
  );
};

export default App;
