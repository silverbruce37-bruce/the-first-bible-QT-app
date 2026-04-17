import React, { useState, useEffect, useCallback } from 'react';
import { generateEvangelismTips } from '../services/geminiService';
import { getMissionPlans, saveMissionPlans } from '../services/syncService';
import { SavedPlanEntry } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';
import { useLanguage } from '../i18n';

interface EvangelismMissionProps {
  passage: string;
  storageKey: string;
}

const EvangelismMission: React.FC<EvangelismMissionProps> = ({ passage, storageKey }) => {
  const { language, t } = useLanguage();
  const [tips, setTips] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [savedEntries, setSavedEntries] = useState<SavedPlanEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
        setIsSyncing(true);
        try {
            const plans = await getMissionPlans(storageKey);
            setSavedEntries(plans);
        } catch (error) {
            console.error("Failed to fetch mission plans:", error);
        } finally {
            setIsSyncing(false);
        }
    };
    fetchPlans();
  }, [storageKey]);

  const fetchTips = useCallback(async () => {
    if (!passage) return;

    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `evangelism-tips-${today}-${language}`;

    // 1. Try to load from cache
    try {
      const cachedTips = window.localStorage.getItem(cacheKey);
      if (cachedTips) {
        setTips(cachedTips);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.error("Failed to read evangelism tips from cache", e);
    }
    
    setIsLoading(true);
    try {
      // 2. Fetch if not cached
      const generatedTips = await generateEvangelismTips(passage, language);
      setTips(generatedTips);
      // 3. Save to cache
      window.localStorage.setItem(cacheKey, generatedTips);
    } catch (error) {
      console.error("Failed to fetch evangelism tips:", error);
      setTips(t('tipsFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [passage, language, t]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  const handleSave = async () => {
    if (!currentPlan.trim()) return;
    
    const locale = language === 'ko' ? 'ko-KR' : 'en-US';
    const newEntry: SavedPlanEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: true }),
      content: currentPlan,
    };

    const newEntries = [newEntry, ...savedEntries];
    setSavedEntries(newEntries); // Optimistic update
    setCurrentPlan(''); // Clear textarea after saving
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);

    try {
        await saveMissionPlans(storageKey, newEntries);
    } catch (error) {
        console.error("Failed to save mission plan:", error);
        setSavedEntries(savedEntries); // Revert on error
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-bold text-emerald-900 mb-4">{t('evangelismTraining')}</h2>
        {isLoading ? <Spinner message={t('generatingTips')} /> : (
          <div className="text-stone-700 bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4 whitespace-pre-wrap leading-relaxed">
            {tips}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-2xl font-bold text-emerald-900 mb-4">{t('myMissionPlan')}</h2>
        <textarea
          rows={8}
          value={currentPlan}
          onChange={(e) => setCurrentPlan(e.target.value)}
          className="w-full p-3 bg-[#f8faf6] text-stone-700 border border-emerald-100 rounded-xl focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition placeholder-emerald-300/80 shadow-inner"
          placeholder={t('missionPlanPlaceholder')}
        />
        <div className="text-right mt-4">
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-400 to-rose-600 text-white font-bold rounded-xl shadow-md hover:shadow-[0_8px_20px_rgb(250,79,70,0.3)] transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-rose-500"
          >
            {isSaved ? t('saved') : t('savePlanButton')}
          </button>
        </div>
        
        <div className="mt-8 border-t border-emerald-100/60 pt-6">
          <h3 className="text-xl font-bold text-emerald-900 mb-4">{t('myRecords')}</h3>
          {isSyncing ? (
            <Spinner message={t('syncingPlans')} />
          ) : savedEntries.length === 0 ? (
            <div className="text-center py-8 text-emerald-500/70">
              <p>{t('noPlans')}</p>
              <p className="text-sm mt-1">{t('noPlansHint')}</p>
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
                  <p className="text-stone-600 whitespace-pre-wrap mt-2 text-sm leading-relaxed">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EvangelismMission;
