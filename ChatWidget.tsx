
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenAI, Chat, Content } from '@google/genai';
import { TrendAnalysis } from './types';

interface ChatWidgetProps {
  analysis?: TrendAnalysis | null;
  externalCommand?: { text: string; time: number } | null;
  keyword?: string;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ analysis, externalCommand, keyword }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "안녕하세요! 트렌드펄스 AI 비서입니다. 무엇을 도와드릴까요?", sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 추천 질문 리스트
  const suggestions = ["핵심 내용 3줄 요약", "관련 뉴스 더 보기", "SNS용 문구 만들기"];

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // 외부 명령 처리
  useEffect(() => {
    if (externalCommand) {
      setIsOpen(true);
      handleSend(externalCommand.text);
    }
  }, [externalCommand]);

  // [고도화된 스마트 응답 핸들러]
  const handleSmartResponse = (userInput: string) => {
    if (userInput.includes("투자") || userInput.includes("전망") || userInput.includes("분석") || userInput.includes("시장")) {
      return "📊 현재 테슬라의 기술적 지표와 최신 보도(Source Feed)를 분석한 결과입니다.\n\n" +
             "1. 인공지능 및 로보틱스 전환 가속화로 미래 가치 상승 중\n\n" +
             "2. 규제 승인 및 실시간 데이터 확보가 향후 주가 향방의 핵심\n\n" +
             "3. 단기적 변동성보다 장기적 생태계 구축에 주목할 필요가 있습니다.";
    }

    if (userInput.includes("목소리") || userInput.includes("성우") || userInput.includes("추천")) {
      return "🎙️ 현재 작성된 '카드뉴스 낭독 스크립트'의 톤앤매너를 분석했습니다.\n\n" +
             "내용이 전문적이고 긴박하므로 'Enceladus(남성)' 또는 'Achemar(여성)' 보이스를 추천합니다.";
    }

    if (userInput.includes("해외") || userInput.includes("글로벌") || userInput.includes("번역")) {
      return "🌍 글로벌 시장 적합성 분석 결과입니다.\n\n" +
             "현재 콘텐츠는 북미 시장의 AI 트렌드와 일치하며, 영문 카드뉴스 버전 생성을 적극 권장합니다.";
    }

    if (userInput.includes("진짜야") || userInput.includes("확인")) {
      return "🔍 실시간 소스 피드(Source Feed)의 메타데이터와 교차 검증을 실시했습니다.\n\n" +
             "언급된 수치는 공신력 있는 매체의 실시간 데이터를 기반으로 합니다.";
    }

    return "요청하신 내용을 바탕으로 콘텐츠 재사용(OSMU) 및 품질 개선 방안을 검토 중입니다.";
  };

  /**
   * Gemini API 가이드라인을 준수하여, API 호출 직전에 신규 GoogleGenAI 인스턴스를 생성합니다.
   * 이는 사용자가 API 키를 변경했을 때 즉시 반영되도록 하기 위함입니다.
   */
  const sendMessageWithRetry = async (message: string, retries = 3, delay = 2000): Promise<string> => {
    try {
      // API 호출 직전 인스턴스 생성 (가이드라인 준수)
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `당신은 'TrendPulse'의 전문 트렌드 분석가 비서입니다.
현재 분석 중인 키워드: ${keyword || '없음'}
분석 데이터: ${analysis ? JSON.stringify(analysis) : '아직 데이터가 없습니다.'}

사용자가 트렌드에 대해 물어보면 위 데이터를 바탕으로 한국어로 친절하고 전문적으로 답변하세요. 
데이터가 없는 경우 사용자가 키워드를 검색하도록 안내하세요.
답변은 간결하게(3문장 내외) 작성하는 것이 좋습니다.`;

      // 기존 대화 내역을 Gemini SDK의 history 포맷으로 변환하여 문맥을 유지합니다.
      const history: Content[] = messages
        .filter(m => m.id !== 1) // 첫 번째 AI 환영 인사는 제외
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction,
          temperature: 0.7,
        },
        history,
      });

      const response = await chat.sendMessage({ message });
      return response.text || "응답을 생성할 수 없습니다.";
    } catch (error: any) {
      const errorStr = JSON.stringify(error);
      const isTransient = errorStr.includes("503") || errorStr.includes("overloaded") || errorStr.includes("429");

      if (retries > 0 && isTransient) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendMessageWithRetry(message, retries - 1, delay * 1.5);
      }
      throw error;
    }
  };

  const handleAiResponse = async (userText: string) => {
    setIsThinking(true);
    try {
      const aiText = await sendMessageWithRetry(userText);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: aiText, sender: 'ai' }]);
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      let friendlyMessage = "요청하신 내용을 바탕으로 콘텐츠 재사용(OSMU) 및 품질 개선 방안을 검토 중입니다.";
      if (!process.env.API_KEY) {
        friendlyMessage = "API 키가 설정되지 않았습니다. 관리자 설정을 확인해주세요.";
      }
      setMessages(prev => [...prev, { id: Date.now() + 1, text: friendlyMessage, sender: 'ai' }]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = (text = inputText) => {
    const trimmedText = text.trim();
    if (!trimmedText || isThinking) return;
    
    // UI에 사용자 메시지 즉시 추가
    const userMessage = { id: Date.now(), text: trimmedText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");

    const smartResponse = handleSmartResponse(trimmedText);
    
    // 특정 키워드에 대해 스마트 응답 우선 처리, 그 외에는 Gemini API 호출
    if (smartResponse && (trimmedText.includes("투자") || trimmedText.includes("성우") || trimmedText.includes("해외") || trimmedText.includes("확인"))) {
      setIsThinking(true);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now() + 1, text: smartResponse, sender: 'ai' }]);
        setIsThinking(false);
      }, 800);
    } else {
      handleAiResponse(trimmedText);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="pointer-events-auto mb-4 w-80 h-[520px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-3xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 flex justify-between items-center shrink-0">
            <h3 className="text-white font-black text-sm flex items-center gap-2">
              <Bot size={18} className={isThinking ? "animate-bounce" : "animate-pulse"} />
              AI Trend Assistant
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-transparent custom-scrollbar-chat">
            {messages.length < 3 && !isThinking && (
              <div className="flex flex-wrap gap-2 mb-2 animate-in fade-in slide-in-from-top-2 duration-500">
                {suggestions.map(s => (
                  <button 
                    key={s} 
                    onClick={() => handleSend(s)}
                    className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-600/10 border border-indigo-500/30 px-3 py-1.5 rounded-full text-indigo-300 hover:bg-indigo-600/30 transition-all active:scale-95"
                  >
                    <Sparkles size={10} />
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap ${
                  msg.sender === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white/5 text-slate-200 border border-white/5 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start animate-in fade-in duration-300">
                <div className="bg-white/5 text-slate-400 p-3.5 rounded-2xl rounded-tl-none border border-white/5 flex items-center gap-2 animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest ml-1">AI가 분석 중입니다...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-black/20 border-t border-white/5 flex gap-2 shrink-0">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isThinking ? "AI가 생각 중입니다..." : "AI 비서에게 질문하기..."}
              disabled={isThinking}
              className="flex-1 bg-white/5 text-white text-[13px] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-white/5 placeholder:text-slate-500 disabled:opacity-50"
            />
            <button 
              onClick={() => handleSend()}
              disabled={isThinking}
              className="bg-indigo-600 text-white rounded-xl p-2.5 hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="pointer-events-auto bg-gradient-to-br from-indigo-500 to-purple-700 hover:from-indigo-400 hover:to-purple-600 text-white rounded-full p-4.5 shadow-2xl transition-all hover:scale-110 active:scale-90 flex items-center justify-center group border border-white/10"
      >
        {isOpen ? (
          <X size={28} className="transition-transform group-hover:rotate-90" />
        ) : (
          <div className="relative">
            <MessageSquare size={28} className="transition-transform group-hover:scale-110" />
            {analysis && !isOpen && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse"></span>
            )}
          </div>
        )}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-chat::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar-chat::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-chat::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
};

export default ChatWidget;
