
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsItem, TrendAnalysis } from "../types";

const extractErrorMessage = (error: any): string => {
  if (!error) return "알 수 없는 오류가 발생했습니다.";
  
  if (typeof error === 'object') {
    const apiError = error.error || error;
    if (apiError.message) return apiError.message;
    try {
      return JSON.stringify(error);
    } catch (e) {
      return String(error);
    }
  }
  return String(error);
};

const handleApiError = (error: any): string => {
  const message = extractErrorMessage(error);
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("503") || lowerMsg.includes("overloaded") || lowerMsg.includes("unavailable")) {
    return "현재 AI 모델 서버가 혼잡합니다. 잠시 후 상단의 '분석 엔진' 버튼을 다시 눌러주세요.";
  }
  if (lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota")) {
    return "무료 사용량 한도가 초과되었습니다. 잠시 후 다시 시도하거나 다른 API 키를 사용해주세요.";
  }
  return message.substring(0, 150);
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 3000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const rawMsg = extractErrorMessage(error).toLowerCase();
    const isTransient = 
      rawMsg.includes("503") || 
      rawMsg.includes("overloaded") || 
      rawMsg.includes("unavailable") ||
      rawMsg.includes("429") || 
      rawMsg.includes("resource_exhausted") || 
      rawMsg.includes("quota");

    if (retries > 0 && isTransient) {
      console.warn(`일시적 서버 혼잡 발생. ${delay/1000}초 후 재시도 중... (남은 횟수: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export class GeminiTrendService {
  async fetchTrendsAndAnalysis(keyword: string): Promise<{ news: NewsItem[]; analysis: TrendAnalysis }> {
    return withRetry(async () => {
      const prompt = `"${keyword}"에 대한 최신 뉴스 및 산업 트렌드를 분석하세요.
      
      [필수 요구사항]
      1. 'summary' 필드는 반드시 1번부터 5번까지 번호가 매겨진 5개의 문장으로 작성하세요.
      2. 형식: "1. [내용]\n2. [내용]\n3. [내용]\n4. [내용]\n5. [내용]"
      3. 각 문장은 독립적이고 명확해야 합니다.
      4. 한국어로 작성하며, 전문적이고 통찰력 있는 톤을 유지하세요.
      5. 'sentiment'는 positive, neutral, negative 중 하나를 선택하세요.
      6. 'growthScore'는 0에서 100 사이의 숫자로 지정하세요.
      
      반드시 검색 도구(googleSearch)를 사용하여 실시간 데이터를 참조하고, 참고한 실제 기사들의 URL을 함께 제공해야 합니다.`;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "5-point numbered list summary" },
              sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
              keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 key takeaway points" },
              growthScore: { type: Type.NUMBER, description: "Score from 0 to 100" }
            },
            required: ["summary", "sentiment", "keyPoints", "growthScore"]
          }
        },
      });

      // 1. 그라운딩 데이터 추출 (데이터 소스)
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
      let news: NewsItem[] = [];

      if (groundingMetadata?.groundingChunks) {
        news = groundingMetadata.groundingChunks.map((chunk: any, index: number) => {
          const web = chunk.web;
          const uri = web?.uri || '#';
          const title = web?.title || chunk.text || `${keyword} 관련 분석 뉴스 ${index + 1}`;
          let source = 'AI 리서치 센터';
          
          if (uri && uri !== '#') {
            try {
              source = new URL(uri).hostname.replace('www.', '');
            } catch (e) {}
          }
          
          return { title, uri, source };
        }).filter((item: NewsItem) => item.uri !== '#');
      }

      // 2. 검색 결과가 아예 없을 경우를 위한 폴백(Fallback) 데이터 생성
      if (news.length === 0) {
        news = [
          { 
            title: `${keyword} 관련 실시간 트렌드 분석 보고서`, 
            uri: `https://www.google.com/search?q=${encodeURIComponent(keyword)}+news`, 
            source: 'Google News (Real-time)' 
          },
          { 
            title: `${keyword} 산업 동향 및 기술 스택 리서치`, 
            uri: `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(keyword)}`, 
            source: 'Naver News (Live)' 
          }
        ];
      }

      try {
        const analysis = JSON.parse(response.text);
        return { news, analysis };
      } catch (e) {
        throw new Error("분석 데이터를 처리하는 중 오류가 발생했습니다.");
      }
    });
  }
}

export const generateExpandedContent = async (originalSummary: string, type: 'image' | 'video' | 'sns', stylePrompt?: string) => {
  return withRetry(async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = "";
      let config: any = {};

      if (type === 'image') {
        prompt = `뉴스 요약본을 바탕으로 시각적인 카드뉴스를 제작하기 위한 데이터를 생성하세요.
        
[규칙]
1. 영문 표기를 최소화하고 한국어로 작성하세요.
2. 'news_body'는 반드시 1. 2. 3. 4. 5. 번호가 붙은 5개 문장이어야 합니다.
3. 'image_prompt'는 이미지 생성 AI를 위한 영문 묘사 프롬프트여야 합니다.

[대상 요약본]
${originalSummary}`;

        config = {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              news_title: { type: Type.STRING },
              news_body: { type: Type.STRING },
              image_prompt: { type: Type.STRING }
            },
            required: ["news_title", "news_body", "image_prompt"]
          }
        };
      } else {
        const prompts = {
          video: `(TTS 낭독용 스크립트): ${originalSummary}`,
          sns: `다음 내용을 바탕으로 인스타그램 게시물 문구와 해시태그를 한국어로 작성해줘: ${originalSummary}`
        };
        prompt = prompts[type];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config
      });
      return response.text;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  });
};

export const generateTTS = async (text: string, voiceName: string, styleInstruction?: string) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fullPrompt = styleInstruction ? `Say ${styleInstruction}: ${text}` : text;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: fullPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");
    return base64Audio;
  });
};

export const generateVideoWithVeo = async (prompt: string, imageBase64?: string): Promise<string | null> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const videoConfig: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Professional motion graphics: ${prompt}`,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
    };

    if (imageBase64) {
      const pureBase64 = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
      videoConfig.image = { imageBytes: pureBase64, mimeType: 'image/png' };
    }

    let operation = await ai.models.generateVideos(videoConfig);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    return downloadLink ? `${downloadLink}&key=${process.env.API_KEY}` : null;
  });
};
