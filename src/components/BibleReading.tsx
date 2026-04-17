
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DailyReading, ArchivedReading } from '../types';
import { generateComprehensiveReadingContent, generateContextImage, explainPassageSelection } from '../services/geminiService';
import { readingPlan, getFullSchedule } from '../constants';
import { getMeditationStatus, saveMeditationStatus, MeditationRecord, MeditationStatus, getArchivedReadings, saveArchivedReading } from '../services/syncService';
import Card from './common/Card';
import Spinner from './common/Spinner';
import MusicRecommendation from './MusicRecommendation';
import PrayerTraining from './PrayerTraining';
import SermonOutline from './SermonOutline';
import BibleChat from './BibleChat';
import StoryKeywords from './StoryKeywords';
import ArchivedReadingModal from './ArchivedReadingModal';
import ExplanationModal from './ExplanationModal';
import { useLanguage } from '../i18n';

interface BibleReadingProps {
  reading: DailyReading;
  selectedDay: number;
  onDayChange: (day: number) => void;
  onPassageLoaded: (passage: string) => void;
}

interface CachedReadingData {
  passage: string;
  meditationGuide: string;
  context: string;
  intention: string;
  imagePrompt: string;
  contextImageUrl: string | null;
}

const BibleReading: React.FC<BibleReadingProps> = ({ reading, selectedDay, onDayChange, onPassageLoaded }) => {
  console.log('BibleReading rendering', { reading, selectedDay });
  const { language, t } = useLanguage();
  const [passage, setPassage] = useState<string>('');
  const [passageIntention, setPassageIntention] = useState<string>('');
  const [meditationGuide, setMeditationGuide] = useState<string>('');
  const [passageContext, setPassageContext] = useState<string>('');
  const [contextImageUrl, setContextImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isPassageCopied, setIsPassageCopied] = useState<boolean>(false);
  const [isTocVisible, setIsTocVisible] = useState(false);
  const [meditationStatus, setMeditationStatus] = useState<MeditationRecord>({});
  const [isSaving, setIsSaving] = useState(false);
  const [archivedReadings, setArchivedReadings] = useState<Record<number, ArchivedReading>>({});
  const [viewingArchivedDay, setViewingArchivedDay] = useState<number | null>(null);

  const passageContainerRef = useRef<HTMLDivElement>(null);
  const [selectionPopover, setSelectionPopover] = useState({ visible: false, x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [explanationModal, setExplanationModal] = useState({
    isOpen: false,
    isLoading: false,
    error: null as string | null,
    content: '',
  });

  const getBookCode = (bookItem: any): string => {
    // Handle both string and object formats from readingPlan
    const name = typeof bookItem === 'string' ? bookItem : (bookItem.en || bookItem.ko);
    const map: Record<string, string> = {
      'Genesis': 'gen', '창세기': 'gen', 'Exodus': 'exo', '출애굽기': 'exo', 'Leviticus': 'lev', '레위기': 'lev', 
      'Numbers': 'num', '민수기': 'num', 'Deuteronomy': 'deu', '신명기': 'deu',
      'Joshua': 'jos', '여호수아': 'jos', 'Judges': 'jdg', '사사기': 'jdg', 'Ruth': 'rut', '룻기': 'rut', 
      '1 Samuel': 'sa1', '사무엘상': 'sa1', '2 Samuel': 'sa2', '사무엘하': 'sa2',
      '1 Kings': 'ki1', '열왕기상': 'ki1', '2 Kings': 'ki2', '열왕기하': 'ki2', 
      '1 Chronicles': 'ch1', '역대상': 'ch1', '2 Chronicles': 'ch2', '역대하': 'ch2',
      'Ezra': 'ezr', '에스라': 'ezr', 'Nehemiah': 'neh', '느헤미야': 'neh', 'Esther': 'est', '에스더': 'est', 
      'Job': 'job', '욥기': 'job', 'Psalms': 'psa', '시편': 'psa',
      'Proverbs': 'pro', '잠언': 'pro', 'Ecclesiastes': 'ecc', '전도서': 'ecc', 'Song of Solomon': 'sol', '아가': 'sol', 
      'Isaiah': 'isa', '이사야': 'isa', 'Jeremiah': 'jer', '예레미야': 'jer', 'Lamentations': 'lam', '예레미야애가': 'lam', 
      'Ezekiel': 'eze', '에스겔': 'eze', 'Daniel': 'dan', '다니엘': 'dan',
      'Hosea': 'hos', '호세아': 'hos', 'Joel': 'joe', '요엘': 'joe', 'Amos': 'amo', '아모스': 'amo', 
      'Obadiah': 'oba', '오바댜': 'oba', 'Jonah': 'jon', '요나': 'jon',
      'Micah': 'mic', '미가': 'mic', 'Nahum': 'nah', '나훔': 'nah', 'Habakkuk': 'hab', '하박국': 'hab', 
      'Zephaniah': 'zep', '스바냐': 'zep', 'Haggai': 'hag', '학개': 'hag',
      'Zechariah': 'zec', '스가랴': 'zec', 'Malachi': 'mal', '말라기': 'mal', 
      'Matthew': 'mat', '마태복음': 'mat', 'Mark': 'mar', '마가복음': 'mar', 'Luke': 'luk', '누가복음': 'luk',
      'John': 'joh', '요한복음': 'joh', 'Acts': 'act', '사도행전': 'act', 'Romans': 'rom', '로마서': 'rom', 
      '1 Corinthians': 'co1', '고린도전서': 'co1', '2 Corinthians': 'co2', '고린도후서': 'co2',
      'Galatians': 'gal', '갈라디아서': 'gal', 'Ephesians': 'eph', '에베소서': 'eph', 
      'Philippians': 'phi', '빌립보서': 'phi', 'Colossians': 'col', '골로새서': 'col',
      '1 Thessalonians': 'th1', '데살로니가전서': 'th1', '2 Thessalonians': 'th2', '데살로니가후서': 'th2', 
      '1 Timothy': 'ti1', '디모데전서': 'ti1', '2 Timothy': 'ti2', '디모데후서': 'ti2',
      'Titus': 'tit', '디도서': 'tit', 'Philemon': 'phm', '빌레몬서': 'phm', 'Hebrews': 'heb', '히브리서': 'heb', 
      'James': 'jam', '야고보서': 'jam', '1 Peter': 'pe1', '베드로전서': 'pe1',
      '2 Peter': 'pe2', '베드로후서': 'pe2', '1 John': 'jo1', '요한1서': 'jo1', '2 John': 'jo2', '요한2서': 'jo2', 
      '3 John': 'jo3', '요한3서': 'jo3', 'Jude': 'jud', '유다서': 'jud',
      'Revelation': 'rev', '요한계시록': 'rev'
    };
    return map[name] || name.toLowerCase().substring(0, 3);
  };

  const fullSchedule = useMemo(() => getFullSchedule(language), [language]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [status, archives] = await Promise.all([
          getMeditationStatus(),
          getArchivedReadings()
        ]);
        setMeditationStatus(status);
        setArchivedReadings(archives);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      }
    };
    fetchInitialData();
  }, []);

  const totalDays = useMemo(() => Math.ceil(readingPlan.length / 2), []);

  const handleStatusChange = async (day: number, status: MeditationStatus) => {
    const newStatus = { ...meditationStatus };
    if (newStatus[day] === status) {
      delete newStatus[day];
    } else {
      newStatus[day] = status;
    }
    setMeditationStatus(newStatus);

    try {
      await saveMeditationStatus(newStatus);
    } catch (error) {
      console.error("Failed to save meditation status:", error);
    }
  };

  const handleCompleteReading = async () => {
    if (!passage || !meditationGuide) return;
    setIsSaving(true);

    const readingReference = `${reading[0].book} ${reading[0].chapter}-${reading[1].chapter}`;

    const dataToArchive: ArchivedReading = {
      day: selectedDay,
      dateSaved: new Date().toISOString(),
      readingReference,
      passage,
      meditationGuide,
      context: passageContext,
      intention: passageIntention,
      contextImageUrl,
    };

    try {
      await saveArchivedReading(selectedDay, dataToArchive);
      setArchivedReadings(prev => ({ ...prev, [selectedDay]: dataToArchive }));
      // Automatically mark as 'good'
      if (meditationStatus[selectedDay] !== 'good') {
        handleStatusChange(selectedDay, 'good');
      }
    } catch (error) {
      console.error("Failed to save archived reading:", error);
    } finally {
      setTimeout(() => setIsSaving(false), 2000);
    }
  };

  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.match(/^\d+\./) || line.match(/^\d+:/) || line.match(/^\d+\s/)) {
        return <p key={index} className="mb-2"><span className="font-semibold text-sky-400 mr-2">{line.split(' ')[0]}</span>{line.substring(line.indexOf(' ') + 1)}</p>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h3 key={index} className="text-xl font-bold text-slate-200 mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>
      }
      return <p key={index} className="mb-2">{line}</p>;
    });
  };

  const handleCopy = (textToCopy: string, setCopiedState: React.Dispatch<React.SetStateAction<boolean>>) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 2000);
      })
      .catch(err => {
        console.error('Clipboard copy failed:', err);
        alert(t('copyFailed'));
      });
  };

  const handleMouseUp = () => {
    if (!passageContainerRef.current) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 5 && passageContainerRef.current.contains(selection.anchorNode)) {
      const selected = selection.toString().trim();
      setSelectedText(selected);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = passageContainerRef.current.getBoundingClientRect();

      setSelectionPopover({
        visible: true,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + passageContainerRef.current.scrollTop,
      });
    } else {
      setSelectionPopover({ visible: false, x: 0, y: 0 });
    }
  };

  const handleExplainClick = async () => {
    if (!selectedText) return;

    setSelectionPopover({ visible: false, x: 0, y: 0 });
    setExplanationModal({ isOpen: true, isLoading: true, error: null, content: '' });

    try {
      const result = await explainPassageSelection(selectedText, passage, language);
      setExplanationModal({ isOpen: true, isLoading: false, error: null, content: result });
    } catch (err) {
      console.error(err);
      setExplanationModal({
        isOpen: true,
        isLoading: false,
        error: t('explanationApiError'),
        content: ''
      });
    }
  };

  const closeExplanationModal = () => {
    setExplanationModal({ isOpen: false, isLoading: false, error: null, content: '' });
    setSelectedText('');
  };

  // Safe localStorage utility to handle QuotaExceededError
  const safeSetItem = (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn("Storage quota exceeded. Clearing old caches to make room.");
        // Clear all dynamic AI generated content caches (base64 images are large)
        Object.keys(window.localStorage).forEach(k => {
          if (k.startsWith('reading-cache-') || k.startsWith('header-sketch-') || k.startsWith('journey-map-')) {
            window.localStorage.removeItem(k);
          }
        });
        // Try setting it again after clearing
        try {
          window.localStorage.setItem(key, value);
        } catch (retryError) {
          console.error("LocalStorage still full even after clearing caches.", retryError);
        }
      }
    }
  };

  const fetchContent = useCallback(async () => {
    if (!reading || reading.length < 2) return;

    // Cache content per day and language
    const cacheKey = `reading-cache-day-${selectedDay}-${language}`;

    try {
      const cachedItem = window.localStorage.getItem(cacheKey);
      if (cachedItem) {
        const cachedData: CachedReadingData = JSON.parse(cachedItem);
        setPassage(cachedData.passage);
        onPassageLoaded(cachedData.passage);
        setMeditationGuide(cachedData.meditationGuide);
        setPassageContext(cachedData.context);
        setPassageIntention(cachedData.intention);
        setContextImageUrl(cachedData.contextImageUrl);
        setIsLoading(false);
        setIsImageLoading(false);
        return;
      }
    } catch (e) {
      console.error("Failed to read from cache", e);
    }

    setIsLoading(true);
    setError(null);
    setContextImageUrl(null);
    setIsImageLoading(false);

    let fetchedPassage = '';

    // 1. Try loading from LOCAL JSON files first (instant!)
    try {
      const bookCode = getBookCode(reading[0].book);
      const results: string[] = [];

      for (const item of reading) {
        const code = getBookCode(item.book);
        const chapter = item.chapter;
        // Try public static data first (pre-stored)
        const fileName = `/data/bible/${code}/${chapter}.json`;
        let success = false;
        try {
          const localResponse = await fetch(fileName);
          if (localResponse.ok) {
            const localData = await localResponse.json();
            if (localData.verses && localData.verses.length > 0) {
              const header = `[ ${item.book} ${chapter}${language === 'ko' ? '장' : ''} ]`;
              const text = localData.verses.map((v: any) => `${v.verse}. ${v.text}`).join('\n');
              results.push(`${header}\n${text}`);
              success = true;
            }
          }
        } catch (fetchErr) {
          console.log(`Fetch failed for ${fileName}`);
        }

        if (!success) {
          // Fallback to API if local file doesn't exist
          try {
            const res = await fetch(`/api/scrape-bible?book=${code}&chapter=${chapter}`);
            if (res.ok) {
              const data = await res.json();
              if (data.verses && data.verses.length > 0) {
                const header = `[ ${item.book} ${chapter}${language === 'ko' ? '장' : ''} ]`;
                const text = data.verses.map((v: any) => `${v.verse}. ${v.text}`).join('\n');
                results.push(`${header}\n${text}`);
              }
            }
          } catch (apiErr) {
            console.warn("API fetch also failed for", code, chapter, apiErr);
          }
        }
      }

      if (results.length > 0) {
        fetchedPassage = results.join('\n\n');
      }
    } catch (e) {
      console.warn("Bible text loading failed", e);
    }

    try {
      const comprehensiveData = await generateComprehensiveReadingContent(reading[0].book, reading[0].chapter, reading[1].chapter, language);

      if (!comprehensiveData) {
        throw new Error("Failed to get data from API.");
      }

      // USE RNKV text if we got it, otherwise use AI text
      const finalPassage = fetchedPassage || comprehensiveData.passage;

      setPassage(finalPassage);
      onPassageLoaded(finalPassage);

      setMeditationGuide(comprehensiveData.meditationGuide);
      setPassageContext(comprehensiveData.context);
      setPassageIntention(comprehensiveData.intention);
      setIsLoading(false);

      setIsImageLoading(true);
      let imageUrl: string | null = null;
      if (comprehensiveData.imagePrompt) {
        imageUrl = await generateContextImage({
          initialPrompt: comprehensiveData.imagePrompt,
          fallbackContext: comprehensiveData.intention,
          language: language,
        });
        setContextImageUrl(imageUrl);
      }
      setIsImageLoading(false);

      const dataToCache: CachedReadingData = {
        ...comprehensiveData,
        passage: finalPassage,
        contextImageUrl: imageUrl,
      };
      safeSetItem(cacheKey, JSON.stringify(dataToCache));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
      if (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
        setError(t('apiQuotaExceeded'));
      } else {
        setError(t('contentError'));
      }
      console.error(err);
      setIsLoading(false);
      setIsImageLoading(false);
    }
  }, [reading, selectedDay, onPassageLoaded, language, t]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  /* Use a capturing group to keep the delimiters in the result array */
  const readingPlanInfoParts = t('readingPlanInfo').split(/\{(\w+)\}/);
  const isTodayArchived = !!archivedReadings[selectedDay];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-100">{t('readingPlanTitle')}</h2>
          <button
            onClick={() => setIsTocVisible(!isTocVisible)}
            className="flex items-center px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500"
          >
            {isTocVisible ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                <span>{t('hideButton')}</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                <span>{t('showAllButton')}</span>
              </>
            )}
          </button>
        </div>
        {isTocVisible && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <p className="text-sm text-slate-400 mb-4">
              {readingPlanInfoParts.map((part, i) => {
                if (part === 'totalDays') return <strong key={i} className="text-sky-400">{totalDays}</strong>;
                if (part === 'currentDay') return <strong key={i} className="text-sky-400">{selectedDay}</strong>;
                return <span key={i}>{part}</span>
              })}
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 pr-1">
              {fullSchedule.map(item => {
                const status = meditationStatus[item.day];
                const isArchived = !!archivedReadings[item.day];
                const isSelected = item.day === selectedDay;

                let bgClass = 'bg-slate-700 hover:bg-slate-600 text-slate-300';
                let borderClass = 'border-slate-600';

                if (status === 'good') {
                  bgClass = 'bg-green-600 text-white hover:bg-green-500';
                  borderClass = 'border-green-400';
                } else if (status === 'ok') {
                  bgClass = 'bg-amber-600 text-white hover:bg-amber-500';
                  borderClass = 'border-amber-400';
                } else if (status === 'bad') {
                  bgClass = 'bg-red-600 text-white hover:bg-red-500';
                  borderClass = 'border-red-400';
                }

                if (isSelected) {
                  borderClass = 'text-white ring-2 ring-white ring-offset-2 ring-offset-slate-900 font-bold ' + bgClass; // Combine for selected state
                } else {
                  borderClass = `border ${borderClass}`;
                }

                return (
                  <button
                    key={item.day}
                    onClick={() => onDayChange(item.day)}
                    title={`${t('day', { day: item.day })}: ${item.reading}`}
                    className={`
                        h-9 rounded-lg flex flex-col items-center justify-center p-0.5 transition-all duration-200 relative
                        ${bgClass} ${isSelected ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-800 z-10 scale-105' : borderClass}
                      `}
                  >
                    <span className="text-[10px] font-mono opacity-70 mb-0.5">{item.day}</span>
                    <span className="text-[10px] leading-tight text-center break-keep line-clamp-1 w-full px-1">
                      {item.reading.replace(/[0-9]+(-[0-9]+)?장?/, '').trim() || item.reading}
                    </span>

                    {status && (
                      <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-white/50'}`} />
                    )}

                    {isArchived && (
                      <div className="absolute bottom-1 w-full flex justify-center">
                        <div className="w-1 h-1 rounded-full bg-white/70"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 text-xs text-slate-400 flex flex-wrap gap-4 justify-center">
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-600 mr-2"></div>{t('meditationGood')}</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-600 mr-2"></div>{t('meditationOk')}</div>
              <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-600 mr-2"></div>{t('meditationBad')}</div>
            </div>
          </div>
        )}
      </Card>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-100">{t('todaysPassage')}</h2>
          {!isLoading && passage && (
            <button
              onClick={() => handleCopy(passage, setIsPassageCopied)}
              className="flex items-center px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500"
            >
              {isPassageCopied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t('copied')}</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>{t('copyButton')}</span>
                </>
              )}
            </button>
          )}
        </div>
        {isLoading ? <Spinner message={t('loadingPassage')} /> : error ? <p className="text-red-400 p-4 bg-red-500/10 rounded-lg">{error}</p> : (
          <div
            ref={passageContainerRef}
            onMouseUp={handleMouseUp}
            className="max-h-[50vh] overflow-y-auto p-4 bg-slate-900 rounded-lg text-slate-300 leading-loose relative"
          >
            {selectionPopover.visible && (
              <button
                onClick={handleExplainClick}
                className="absolute z-10 p-2 bg-sky-500 text-white rounded-full shadow-lg hover:bg-sky-400 transition-transform transform -translate-x-1/2 -translate-y-full animate-fade-in"
                style={{ left: `${selectionPopover.x}px`, top: `${selectionPopover.y}px` }}
                title={t('explainSelection')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            {formatText(passage)}
          </div>
        )}
      </Card>

      {!isLoading && passage && (
        <>
          <StoryKeywords passage={passage} />
          <BibleChat passage={passage} />
        </>
      )}

      <Card>
        <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 inline-block mr-3 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t('lordsWill')}</span>
        </h2>
        {isLoading ? <Spinner message={t('analyzingIntent')} /> : error ? null : (
          <div className="text-slate-300 space-y-4 whitespace-pre-wrap leading-relaxed">
            {passageIntention}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-100">{t('meditationGuide')}</h2>
          {!isLoading && meditationGuide && (
            <button
              onClick={() => handleCopy(meditationGuide, setIsCopied)}
              className="flex items-center px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500"
            >
              {isCopied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{t('copied')}</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span>{t('copyButton')}</span>
                </>
              )}
            </button>
          )}
        </div>
        {isLoading ? <Spinner message={t('generatingGuide')} /> : error ? null : (
          <div className="text-slate-300 space-y-4 whitespace-pre-wrap leading-relaxed">
            {formatText(meditationGuide)}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 inline-block mr-3 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9m-9 9a9 9 0 00-9-9" />
          </svg>
          <span>{t('timeAndPlace')}</span>
        </h2>
        {isLoading ? <Spinner message={t('generatingBg')} /> : error ? null : (
          <div>
            {isImageLoading && (
              <div className="w-full bg-slate-700 rounded-lg h-64 mb-4 flex items-center justify-center">
                <Spinner message={t('generatingBgImage')} />
              </div>
            )}
            {contextImageUrl && !isImageLoading && (
              <div className="mb-4 rounded-lg overflow-hidden shadow-lg">
                <img src={contextImageUrl} alt={t('biblicalContextAlt')} className="w-full h-auto object-cover" />
              </div>
            )}
            <div className="text-slate-300 space-y-4 whitespace-pre-wrap leading-relaxed">
              {passageContext}
            </div>
          </div>
        )}
      </Card>

      {!isLoading && passage && !error && (
        <div className="my-6 text-center">
          <button
            onClick={handleCompleteReading}
            disabled={isLoading || isSaving || isTodayArchived}
            className="w-full md:w-auto px-8 py-4 bg-green-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-green-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center mx-auto"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('meditationSaved')}
              </>
            ) : isTodayArchived ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('meditationAlreadySaved')}
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t('completeMeditation')}
              </>
            )}
          </button>
        </div>
      )}


      {!isLoading && passage && (
        <>
          <MusicRecommendation
            context={passage}
            title={t('passageMusicTitle')}
            id="passage-music-recommender"
          />
          <PrayerTraining passage={passage} />
          <SermonOutline passage={passage} />
        </>
      )}

      <ArchivedReadingModal
        reading={viewingArchivedDay ? archivedReadings[viewingArchivedDay] : null}
        onClose={() => setViewingArchivedDay(null)}
        formatText={formatText}
      />
      <ExplanationModal
        isOpen={explanationModal.isOpen}
        onClose={closeExplanationModal}
        isLoading={explanationModal.isLoading}
        error={explanationModal.error}
        selectedText={selectedText}
        explanation={explanationModal.content}
      />
    </div>
  );
};

export default BibleReading;
