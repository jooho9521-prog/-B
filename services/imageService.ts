
import { GoogleGenAI } from "@google/genai";

/**
 * Gemini 2.5 Flash Image 모델을 사용하여 고품질 세로형 이미지를 생성합니다.
 */
export const generateImage = async (prompt: string, stylePrompt?: string): Promise<string | null> => {
  // Always initialize with named parameter and use process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `A professional, cinematic, high-quality vertical business background for a trend report. No text, no grids, 4k resolution. ${stylePrompt ? `Style: ${stylePrompt}.` : ''} Topic: ${prompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    return null;
  }
};

/**
 * (예시) 이미지에서 비디오를 생성하는 AI API 호출을 위한 기본 구조
 * 실제 Veo 모델이나 Stability Video API 연결 시 사용 가능
 */
export const generateVideoFromImage = async (imageBase64: string, prompt: string): Promise<string | null> => {
  // 예: Veo 3.1 모델을 통한 비디오 생성 로직 구현 위치
  console.log("Generating video from image with prompt:", prompt);
  return null;
};
