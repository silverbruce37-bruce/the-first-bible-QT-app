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
      className={`flex-1 py-3 px-2 text-sm md:text-base font-semibold transition-colors duration-300 rounded-t-lg ${
        activeTab === tab 
          ? 'bg-slate-800 text-sky-400' 
          : 'bg-sky-800 text-sky-200 hover:bg-sky-700'
      }`}
    >
      {label}
    </button>
  );

  const LanguageButton = ({ lang, label }: { lang: 'ko' | 'en', label: string }) => (
    <button
      onClick={() => setLanguage(lang)}
      className={`px-3 py-1 text-xs rounded-md transition-colors ${
        language === lang ? 'bg-sky-200 text-sky-800 font-bold' : 'bg-transparent text-sky-200 hover:bg-sky-700'
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

  if (isCheckingApiKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner message={t('loading')} />
      </div>
    );
  }

  if (!apiKeySelected) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center text-slate-300 p-4">
        <div className="max-w-md">
            <h1 className="text-3xl font-bold text-white mb-4">{t('apiKeyRequiredTitle')}</h1>
            <p className="mb-6">{t('apiKeyRequiredMessage')}</p>
            <button
                onClick={handleSelectApiKey}
                className="w-full px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500"
            >
                {t('selectApiKeyButton')}
            </button>
            <p className="text-xs text-slate-500 mt-4" dangerouslySetInnerHTML={{ __html: t('billingInfoLink') }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-300">
      <header className="bg-sky-800 text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 pt-4 pb-2 text-center relative">
          <div className="absolute top-3 left-4">
            <span className="font-bold text-white tracking-widest text-sm uppercase">Live in Wonder</span>
          </div>
          <div className="absolute top-2 right-2 flex space-x-1 border border-sky-600 rounded-lg p-0.5">
            <LanguageButton lang="ko" label={t('korean')} />
            <LanguageButton lang="en" label={t('english')} />
          </div>
          <p className="text-sm md:text-base text-sky-200">{t('headerSubtitle')}</p>
          <h1 className="text-4xl md:text-5xl font-bold mt-1 tracking-wider">{t('headerTitle')}</h1>
          <p className="mt-4 text-sky-200">{todayDateString}</p>
          <p className="mt-1 font-semibold text-lg">{t('todaysWord')}: {readingRef}</p>
        </div>
        <nav className="container mx-auto px-2 md:px-4 flex justify-around mt-4">
          <NavButton tab="reading" label={t('navReading')} />
          <NavButton tab="diary" label={t('navDiary')} />
          <NavButton tab="mission" label={t('navMission')} />
        </nav>
      </header>

      <main className="container mx-auto p-4 md:p-6">
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
              <div className="text-center p-8 bg-slate-800 rounded-lg">{t('readingFirst')}</div>
            )}
          </ErrorBoundary>
        )}
      </main>

      <footer className="text-center py-6 text-slate-400">
        <p>{t('footer', { year: new Date().getFullYear() })}</p>
      </footer>
      <DebugInfo />
    </div>
  );
};

export default App;
