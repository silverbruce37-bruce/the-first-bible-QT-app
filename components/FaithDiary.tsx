import React, { useState, useMemo, useEffect } from 'react';
import { DiaryEntry, SavedDiaryEntry } from '../types';
import { getDiaryEntries, saveDiaryEntries } from '../services/syncService';
import Card from './common/Card';
import Spinner from './common/Spinner';
import MusicRecommendation from './MusicRecommendation';
import { useLanguage } from '../i18n';

interface FaithDiaryProps {
  storageKey: string;
}

// NOTE: This hook is kept for saving the current draft to local storage to prevent data loss.
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
};

const FaithDiary: React.FC<FaithDiaryProps> = ({ storageKey }) => {
  const { language, t } = useLanguage();
  const [currentEntry, setCurrentEntry] = useLocalStorage<DiaryEntry>(`${storageKey}-current`, {
    repentance: '',
    resolve: '',
    dream: '',
  });
  const [savedEntries, setSavedEntries] = useState<SavedDiaryEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
        setIsSyncing(true);
        try {
            const entries = await getDiaryEntries(`${storageKey}-saved`);
            setSavedEntries(entries);
        } catch (error) {
            console.error("Failed to fetch diary entries:", error);
        } finally {
            setIsSyncing(false);
        }
    };
    fetchEntries();
  }, [storageKey]);

  const handleChange = (field: keyof DiaryEntry, value: string) => {
    setCurrentEntry({ ...currentEntry, [field]: value });
  };

  const handleSave = async () => {
    if (!currentEntry.repentance.trim() && !currentEntry.resolve.trim() && !currentEntry.dream.trim()) {
      return; // Don't save empty entries
    }
    
    const locale = language === 'ko' ? 'ko-KR' : 'en-US';
    const newEntry: SavedDiaryEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true }),
      content: currentEntry,
    };

    const newEntries = [newEntry, ...savedEntries];
    setSavedEntries(newEntries); // Optimistic update
    setCurrentEntry({
      repentance: '',
      resolve: '',
      dream: '',
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);

    try {
        await saveDiaryEntries(`${storageKey}-saved`, newEntries);
    } catch (error) {
        console.error("Failed to save diary entries:", error);
        // In a real app, you might revert the state and show an error message.
        setSavedEntries(savedEntries); // Revert on error
    }
  };
  
  const diaryContext = useMemo(() => {
    if (savedEntries.length === 0) {
      return "";
    }
    const latestEntry = savedEntries[0].content;
    const repentanceLabel = language === 'ko' ? '회개와 감사' : 'Repentance and Gratitude';
    const resolveLabel = language === 'ko' ? '결단과 적용' : 'Resolution and Application';
    const dreamLabel = language === 'ko' ? '하나님이 주신 꿈' : 'God-Given Dream';

    return `${repentanceLabel}: ${latestEntry.repentance}\n${resolveLabel}: ${latestEntry.resolve}\n${dreamLabel}: ${latestEntry.dream}`;
  }, [savedEntries, language]);


  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold text-emerald-900 mb-4">{t('diaryTitle')}</h2>
        <div className="space-y-6">
          <div>
            <label htmlFor="repentance" className="block text-lg font-semibold text-emerald-800 mb-2">
              {t('repentanceLabel')}
            </label>
            <textarea
              id="repentance"
              rows={5}
              value={currentEntry.repentance}
              onChange={(e) => handleChange('repentance', e.target.value)}
              className="w-full p-3 bg-[#f8faf6] text-stone-700 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition placeholder-emerald-300/80 shadow-inner"
              placeholder={t('repentancePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="resolve" className="block text-lg font-semibold text-emerald-800 mb-2">
              {t('resolveLabel')}
            </label>
            <textarea
              id="resolve"
              rows={5}
              value={currentEntry.resolve}
              onChange={(e) => handleChange('resolve', e.target.value)}
              className="w-full p-3 bg-[#f8faf6] text-stone-700 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition placeholder-emerald-300/80 shadow-inner"
              placeholder={t('resolvePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="dream" className="block text-lg font-semibold text-emerald-800 mb-2">
              {t('dreamLabel')}
            </label>
            <textarea
              id="dream"
              rows={5}
              value={currentEntry.dream}
              onChange={(e) => handleChange('dream', e.target.value)}
              className="w-full p-3 bg-[#f8faf6] text-stone-700 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition placeholder-emerald-300/80 shadow-inner"
              placeholder={t('dreamPlaceholder')}
            />
          </div>
        </div>
        <div className="text-right mt-6">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-400 to-rose-600 text-white font-bold rounded-xl shadow-md hover:shadow-[0_8px_20px_rgb(250,79,70,0.3)] transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-rose-500"
          >
            {isSaved ? t('saved') : t('saveDiaryButton')}
          </button>
        </div>

        <div className="mt-8 border-t border-emerald-100/60 pt-6">
          <h3 className="text-xl font-bold text-emerald-900 mb-4">{t('todaysRecord')}</h3>
          {isSyncing ? (
            <Spinner message={t('syncingEntries')} />
          ) : savedEntries.length === 0 ? (
            <div className="text-center py-8 text-emerald-500/70">
              <p>{t('noRecords')}</p>
              <p className="text-sm mt-1">{t('noRecordsHint')}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {savedEntries.map((entry) => (
                <div key={entry.id} className="bg-white p-5 rounded-2xl border border-emerald-50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_4px_15px_rgb(0,128,0,0.05)]">
                  <div className="flex justify-between items-center mb-4 border-b border-emerald-50 pb-2">
                    <p className="text-sm font-bold text-rose-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('savedAt', { time: entry.timestamp })}
                    </p>
                  </div>
                  <div className="space-y-4">
                    {entry.content.repentance && (
                      <div>
                        <h4 className="font-semibold text-emerald-800 text-base">{t('repentanceLabel')}</h4>
                        <p className="text-stone-600 whitespace-pre-wrap mt-2 text-sm leading-relaxed">{entry.content.repentance}</p>
                      </div>
                    )}
                    {entry.content.resolve && (
                      <div>
                        <h4 className="font-semibold text-emerald-800 text-base">{t('resolveLabel')}</h4>
                        <p className="text-stone-600 whitespace-pre-wrap mt-2 text-sm leading-relaxed">{entry.content.resolve}</p>
                      </div>
                    )}
                    {entry.content.dream && (
                      <div>
                        <h4 className="font-semibold text-emerald-800 text-base">{t('dreamLabel')}</h4>
                        <p className="text-stone-600 whitespace-pre-wrap mt-2 text-sm leading-relaxed">{entry.content.dream}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
      <MusicRecommendation 
        context={diaryContext} 
        title={t('diaryMusicTitle')}
        id="diary-music-recommender"
      />
    </div>
  );
};

export default FaithDiary;
