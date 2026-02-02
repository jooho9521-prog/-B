
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsItem, TrendAnalysis } from "../types";

/**
 * API 키를 안전하게 가져오는 헬퍼 함수
 */
const getApiKey = (): string => {
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  const apiKey = savedKey || process.env.API_KEY || "";
  return apiKey;
};

export const extractErrorMessage = (error: any): string => {
  if (!error) return "알 수 없는 오류가 발생했습니다.";
  
  // SDK 에러 객체 구조 대응
  if (typeof error === 'object') {
    if (error.message) return error.message;
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

export const handleApiError = (error: any): string => {
  const message = extractErrorMessage(error);
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("503") || lowerMsg.includes("overloaded") || lowerMsg.includes("unavailable")) {
    return "현재 AI 모델 서버가 혼잡합니다. 잠시 후 다시 시도해주세요 (503 Overloaded).";
  }
  if (lowerMsg.includes("429") || lowerMsg.includes("resource_exhausted") || lowerMsg.includes("quota")) {
    return "API 호출 한도가 초과되었습니다. 잠시 후 다시 시도해주세요 (429 Quota Exceeded).";
  }
  return message.substring(0, 200);
};

export const withRetry = async <T>(fn: () => Promise<T>, retries = 5, delay = 4000): Promise<T> => {
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
      console.warn(`[Retry] 일시적 오류 발생. ${delay/1000}초 후 재시도... (남은 횟수: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 1.5); // 지수 백오프 적용
    }
    throw error;
  }
};

export class GeminiTrendService {
  async fetchTrendsAndAnalysis(keyword: string, modeInstruction: string): Promise<{ news: NewsItem[]; analysis: TrendAnalysis }> {
    return withRetry(async () => {
      const prompt = `
        당신은 세계 최고의 트렌드 전략 분석가입니다. 
        사용자가 입력한 키워드 "${keyword}"에 대해 다음 분석 관점을 적용하여 심층 리포트를 작성하세요: 
        
        [현재 분석 관점]: ${modeInstruction}

        [구조적 제약 조건]
        1. 'summary'는 반드시 "1. [내용]\n2. [내용]\n3. [내용]\n4. [내용]\n5. [내용]" 형식을 유지하세요.
        2. 각 문장은 선택된 관점(${modeInstruction})의 핵심 논리를 담고 있어야 합니다.
        3. SWOT인 경우 (1.강점, 2.약점, 3.기회, 4.위협, 5.전략제언) 순으로 작성하세요.
        4. 시장 전망인 경우 (규모, 성장률, 주요플레이어, 리스크, 미래예측) 순으로 구체적 수치를 언급하세요.
        5. 팩트체크인 경우 (주장, 근거확인, 데이터검증, 출처평가, 최종판단) 순으로 비판적으로 작성하세요.
        
        반드시 googleSearch 도구를 사용하여 실시간 웹 데이터를 참조하고, 참고한 실제 기사들의 URL을 함께 제공해야 합니다.
      `;
      
      try {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");

        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING, description: "5-point numbered summary based strictly on the chosen mode" },
                sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
                keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 additional critical key takeaways" },
                growthScore: { type: Type.NUMBER, description: "Score from 0 to 100 based on the trend's potential" }
              },
              required: ["summary", "sentiment", "keyPoints", "growthScore"]
            }
          },
        });

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        let news: NewsItem[] = [];

        if (groundingMetadata?.groundingChunks) {
          news = groundingMetadata.groundingChunks.map((chunk: any, index: number) => {
            const web = chunk.web;
            const uri = web?.uri || '#';
            const title = web?.title || chunk.text || `${keyword} 소스 ${index + 1}`;
            let source = 'Verified Source';
            if (uri && uri !== '#') {
              try { source = new URL(uri).hostname.replace('www.', ''); } catch (e) {}
            }
            return { title, uri, source };
          }).filter((item: NewsItem) => item.uri !== '#');
        }

        if (news.length === 0) {
          news = [{ 
            title: `${keyword} 실시간 분석 데이터 소스`, 
            uri: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`, 
            source: 'Web Intelligence' 
          }];
        }

        const analysis = JSON.parse(response.text);
        return { news, analysis };
      } catch (err: any) {
        console.error("API Error in fetchTrendsAndAnalysis:", err);
        throw new Error(handleApiError(err));
      }
    });
  }
}

export const generateExpandedContent = async (originalSummary: string, type: 'image' | 'video' | 'sns', stylePrompt?: string) => {
  return withRetry(async () => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");
      const ai = new GoogleGenAI({ apiKey });
      
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
          sns: `다음 내용을 바탕으로 인스타그램/트위터용 문구와 해시태그를 한국어로 작성해줘: ${originalSummary}`
        };
        prompt = prompts[type as 'video' | 'sns'];
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
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");
      const ai = new GoogleGenAI({ apiKey });
      const fullPrompt = styleInstruction ? `Say ${styleInstruction}: ${text}` : text;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Audio failed");
      return base64Audio;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  });
};

export const generateVideoWithVeo = async (prompt: string, imageBase64?: string): Promise<string | null> => {
  return withRetry(async () => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API 키가 설정되지 않았습니다.");
      const ai = new GoogleGenAI({ apiKey });
      const videoConfig: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: `Cinematic professional motion: ${prompt}`,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '9:16' }
      };
      if (imageBase64) {
        const pureBase64 = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
        videoConfig.image = { imageBytes: pureBase64, mimeType: 'image/png' };
      }
      let operation = await ai.models.generateVideos(videoConfig);
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation });
      }
      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      return downloadLink ? `${downloadLink}&key=${apiKey}` : null;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  });
};
