import React, { useState, useMemo, useEffect } from 'react';
import { getDailyReading } from './constants';
import { ActiveTab, DailyReading } from './types';
import BibleReading from './components/BibleReading';
import FaithDiary from './components/FaithDiary';
import EvangelismMission from './components/EvangelismMission';
import { useLanguage } from './i18n';
import Spinner from './components/common/Spinner';

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

  useEffect(() => {
    const checkApiKey = async () => {
        setIsCheckingApiKey(true);
        // Check if running in AI Studio environment
        if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
            setApiKeySelected(true);
        }
        // Check for Vite environment variable (for Vercel deployment)
        else if (import.meta.env.VITE_GEMINI_API_KEY) {
            setApiKeySelected(true);
        }
        setIsCheckingApiKey(false);
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
  const dailyReading: DailyReading = getDailyReading(today, language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t('appName');
  }, [language, t]);

  const todayDateString = today.toLocaleDateString(language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  
  const readingRef = `${dailyReading[0].book} ${dailyReading[0].chapter}-${dailyReading[1].chapter}${language === 'ko' ? '장' : ''}`;
  
  const storageKey = today.toISOString().split('T')[0]; // YYYY-MM-DD

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
        {activeTab === 'reading' && <BibleReading reading={dailyReading} onPassageLoaded={setPassage} />}
        {activeTab === 'diary' && <FaithDiary storageKey={`diary-${storageKey}`} />}
        {activeTab === 'mission' && (passage ? <EvangelismMission passage={passage} storageKey={`mission-${storageKey}`}/> : <div className="text-center p-8 bg-slate-800 rounded-lg">{t('readingFirst')}</div>) }
      </main>

      <footer className="text-center py-6 text-slate-400">
        <p>{t('footer', { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
};

export default App;
