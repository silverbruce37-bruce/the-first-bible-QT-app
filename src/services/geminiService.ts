
import { Song, StoryKeywords, PlaceInfoResponse } from "../types";
import { Language } from "../i18n";

const API_V1 = "https://generativelanguage.googleapis.com/v1/models";
const API_V1BETA = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(contents: any, generationConfig?: any) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key is missing.");

  // For direct REST API calls, use snake_case for parameters
  const apiConfig = generationConfig ? {
    response_mime_type: generationConfig.responseMimeType || "text/plain",
    // response_schema: generationConfig.responseSchema // Temporarily disabled for max stability
  } : {};

  const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash-exp"];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `${API_V1}/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: Array.isArray(contents) ? contents : [{ parts: [{ text: contents }] }],
          generationConfig: apiConfig
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
      
      const urlBeta = `${API_V1BETA}/${model}:generateContent?key=${apiKey}`;
      const responseBeta = await fetch(urlBeta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: Array.isArray(contents) ? contents : [{ parts: [{ text: contents }] }],
          generationConfig: apiConfig
        })
      });

      if (responseBeta.ok) {
        const data = await responseBeta.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }

      const errorData = await (response.status !== 200 ? response : responseBeta).json().catch(() => ({}));
      lastError = errorData.error?.message || `API error: ${response.status}`;
    } catch (e: any) {
      lastError = e.message;
    }
  }
  throw new Error(`Gemini failed after trying all models: ${lastError}`);
}

const getPrompts = (language: Language, book: string, chapter1: number, chapter2: number, passage?: string, context?: string) => {
  const prompts = {
    ko: {
      comprehensiveReading: `성경 ${book} ${chapter1}장부터 ${chapter2}장까지의 포괄적인 묵상 자료를 생성해 주세요. 다음 JSON 형식을 엄격히 지켜 응답해 주세요.
{
  "passage": "성경 본문 전체 (현대어 번역, 절 번호 포함)",
  "meditationGuide": "오늘의 묵상 가이드 (핵심 메시지, 질문, 적용, 기도 포함)",
  "context": "역사적, 문화적 배경 (100자 내외)",
  "intention": "이 본문의 기록 목적과 신학적 의도 (3-4문단)",
  "imagePrompt": "이 본문의 주제를 상징하는 사실적인 유화 스타일 이미지 프롬프트 (사람 제외, 자연과 사물 중심)"
}`,
      evangelismTips: `당신은 전도자입니다. 다음 성경 본문을 바탕으로 복음을 전하는 방법을 알려주세요.\n\n본문: ${passage}`,
      recommendMusic: `당신은 찬양 인도자입니다. 다음 글과 어울리는 CCM 또는 찬송가 3-5곡을 추천해주세요. JSON 형식으로 답해주세요: { "songs": [{ "title": "제목", "artist": "가수" }] }\n\n글: ${context}`,
      prayerGuide: `A.C.T.S 모델로 기도문을 작성해주세요.\n\n본문: ${passage}`,
      sermonOutline: `설교 개요를 작성해주세요.\n\n본문: ${passage}`,
      storyKeywords: `키워드 3가지 카테고리로 추출해주세요. JSON: { "positive": [], "sin": [], "hope": [] }\n\n본문: ${passage}`,
      explainSelection: `다음 구절을 이재철 목사님처럼 따뜻하게 해설해주세요.\n\n문맥: ${context}\n\n선택구절: ${passage}`,
      explainSelectionError: "해설 생성 실패",
      prayerGuideError: "기도문 생성 실패",
      sermonOutlineError: "개요 생성 실패",
      evangelismTipsError: "전도 팁 생성 실패"
    },
    en: {
      comprehensiveReading: `Generate comprehensive meditation for Bible ${book} chapters ${chapter1} to ${chapter2}. Respond strictly in JSON format:
{
  "passage": "Full Bible passage with verse numbers",
  "meditationGuide": "Meditation guide (core message, questions, application, prayer)",
  "context": "Historical and cultural background",
  "intention": "Purpose and theological intent",
  "imagePrompt": "Realistic oil painting prompt for this theme (nature/objects only, no people)"
}`,
      evangelismTips: `You are an evangelist. Tips based on: ${passage}`,
      recommendMusic: `Recommend 3-5 worship songs. JSON: { "songs": [{"title": "Title", "artist": "Artist"}] } based on: ${context}`,
      prayerGuide: `Write a prayer using A.C.T.S model based on: ${passage}`,
      sermonOutline: `Sermon outline for: ${passage}`,
      storyKeywords: `Extract 3 keywords. JSON: { "positive": [], "sin": [], "hope": [] } based on: ${passage}`,
      explainSelection: `Explain this passage warmly like a pastor: ${passage} Context: ${context}`,
      explainSelectionError: "Failed to explain",
      prayerGuideError: "Failed to generate prayer",
      sermonOutlineError: "Failed to generate outline",
      evangelismTipsError: "Failed to generate tips"
    }
  };
  return prompts[language] || prompts['ko'];
};

export async function generateComprehensiveReadingContent(book: string, chapter1: number, chapter2: number, language: Language) {
  const p = getPrompts(language, book, chapter1, chapter2);
  const text = await callGemini(p.comprehensiveReading, { responseMimeType: "application/json" });
  return JSON.parse(text);
}

export async function generateEvangelismTips(passage: string, language: Language): Promise<string> {
    const p = getPrompts(language, '', 0, 0, passage);
    return callGemini(p.evangelismTips).catch(() => p.evangelismTipsError);
}

export async function generatePrayerGuide(passage: string, language: Language): Promise<string> {
    const p = getPrompts(language, '', 0, 0, passage);
    return callGemini(p.prayerGuide).catch(() => p.prayerGuideError);
}

export async function generateSermonOutline(passage: string, language: Language): Promise<string> {
    const p = getPrompts(language, '', 0, 0, passage);
    return callGemini(p.sermonOutline).catch(() => p.sermonOutlineError);
}

export async function explainPassageSelection(selectedText: string, passageContext: string, language: Language): Promise<string> {
    const p = getPrompts(language, '', 0, 0, selectedText, passageContext);
    return callGemini(p.explainSelection).catch(() => p.explainSelectionError);
}

export async function generateStoryKeywords(passage: string, language: Language) {
    const p = getPrompts(language, '', 0, 0, passage);
    const text = await callGemini(p.storyKeywords, { responseMimeType: "application/json" });
    return JSON.parse(text);
}

export async function recommendMusic(context: string, language: Language) {
    const p = getPrompts(language, '', 0, 0, undefined, context);
    const text = await callGemini(p.recommendMusic, { responseMimeType: "application/json" });
    const json = JSON.parse(text);
    return json.songs || [];
}

export async function generateContextImage({ initialPrompt }: { initialPrompt: string }) {
    return null;
}

export async function fetchPlaceInfo(city: string, journeyTitle: string, language: Language) {
    return { text: `Info about ${city} during ${journeyTitle}`, links: [] };
}

export async function generateJourneyMap() {
    return null;
}
