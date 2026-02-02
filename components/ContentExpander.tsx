
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateExpandedContent, generateTTS } from '../services/geminiService';
import { generateImage } from '../services/imageService';
import { formatProjectReport, ProjectReport } from '../services/reportService';
import ProjectReportView from './ProjectReportView';
import CardNewsGenerator from './CardNewsGenerator';
import { IMAGE_STYLE_CATEGORIES, IMAGE_STYLES } from '../constants/imageStyles';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Share2, 
  Loader2, 
  ClipboardList,
  Palette,
  Mic2,
  User,
  Zap,
  Play,
  Square,
  Activity,
  FileText,
  AudioLines,
  Download,
  Gauge,
  PlusCircle,
  RefreshCw
} from 'lucide-react';

interface Props {
  summary: string;
  expandedData: {
    image: { img: string; cardData: { title: string; body: string } } | null;
    video: string | null;
    sns: string | null;
  };
  setExpandedData: React.Dispatch<React.SetStateAction<{
    image: { img: string; cardData: { title: string; body: string } } | null;
    video: string | null;
    sns: string | null;
  }>>;
  onShowToast: (msg: string) => void;
}

const GOOGLE_AI_VOICES = [
  { id: 'Achemar', label: 'Achemar', desc: '여성 보이스' },
  { id: 'Achird', label: 'Achird', desc: '남성 보이스' },
  { id: 'Algenib', label: 'Algenib', desc: '남성 보이스' },
  { id: 'Algieba', label: 'Algieba', desc: '남성 보이스' },
  { id: 'Alnilam', label: 'Alnilam', desc: '남성 보이스' },
  { id: 'Aonde', label: 'Aonde', desc: '여성 보이스' },
  { id: 'Autonoe', label: 'Autonoe', desc: '여성 보이스' },
  { id: 'Callirrhoe', label: 'Callirrhoe', desc: '여성 보이스' },
  { id: 'Caron', label: 'Caron', desc: '남성 보이스' },
  { id: 'Despina', label: 'Despina', desc: '여성 보이스' },
  { id: 'Enceladus', label: 'Enceladus', desc: '남성 보이스' },
  { id: 'Erinome', label: 'Erinome', desc: '여성 보이스' },
  { id: 'Fenrir', label: 'Fenrir', desc: '남성 보이스' },
  { id: 'Gacrux', label: 'Gacrux', desc: '여성 보이스' },
  { id: 'Iapetus', label: 'Iapetus', desc: '남성 보이스' },
  { id: 'Kore', label: 'Kore', desc: '여성 보이스' },
  { id: 'Laomedeia', label: 'Laomedeia', desc: '남성 보이스' },
  { id: 'Leda', label: 'Leda', desc: '여성 보이스' },
  { id: 'Orus', label: 'Orus', desc: '남성 보이스' },
  { id: 'Pulcherrima', label: 'Pulcherrima', desc: '여성 보이스' },
  { id: 'Puck', label: 'Puck', desc: '남성 보이스' },
  { id: 'Rasalgethi', label: 'Rasalgethi', desc: '남성 보이스' },
  { id: 'Sadachbia', label: 'Sadachbia', desc: '남성 보이스' },
  { id: 'Sadaltager', label: 'Sadaltager', desc: '남성 보이스' },
  { id: 'Schedar', label: 'Schedar', desc: '남성 보이스' },
  { id: 'Sulafat', label: 'Sulafat', desc: '여성 보이스' },
  { id: 'Umbriel', label: 'Umbriel', desc: '남성 보이스' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', desc: '여성 보이스' },
  { id: 'Zephyr', label: 'Zephyr', desc: '남성 보이스' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi', desc: '남성 보이스' }
];

const STYLE_PRESETS = [
  { id: 0, label: '📺 뉴스 앵커', instruction: 'like a professional news anchor' },
  { id: 1, label: '👔 전문 강사', instruction: 'like a formal lecture instructor' },
  { id: 2, label: '📘 오디오북', instruction: 'soft and clear like an audiobook narrator' },
  { id: 3, label: '📜 다큐멘터리', instruction: 'deep and philosophical like a documentary narrator' },
  { id: 4, label: '🚨 긴급 속보', instruction: 'urgent and loud like an emergency broadcast' },
  { id: 5, label: '💻 IT 리뷰어', instruction: 'energetic and tech-savvy IT reviewer style' },
  { id: 6, label: '💄 뷰티 유튜버', instruction: 'friendly and high-pitched beauty vlogger style' },
  { id: 7, label: '🍲 맛집 탐방', instruction: 'excited and flavorful like a food critic' },
  { id: 8, label: '🌿 감성 브이로그', instruction: 'calm and peaceful vlog style' },
  { id: 9, label: '🛍️ 쇼핑 호스트', instruction: 'persuasive and loud like a shopping host' },
  { id: 10, label: '😊 밝은 에너지', instruction: 'with extremely high energy and joy' },
  { id: 11, label: '😢 슬픈 사연', instruction: 'sad and mournful tone' },
  { id: 12, label: '🌙 심야 라디오', instruction: 'whispering and soft like a midnight radio DJ' },
  { id: 13, label: '😱 공포/미스터리', instruction: 'scary and suspenseful mystery tone' },
  { id: 14, label: '😡 격정적 호소', instruction: 'passionate and angry tone' },
  { id: 15, label: '🤖 AI 로봇', instruction: 'monotonous and robotic voice' },
  { id: 16, label: '🧚 동화 구연', instruction: 'magical and exaggerated for children' },
  { id: 17, label: '🏃 스포츠 캐스터', instruction: 'shouting and fast like a sports caster' },
  { id: 18, label: '🧘 명상 가이드', instruction: 'slow and deep breathing meditation guide' },
  { id: 19, label: '🎮 게임 스트리머', instruction: 'playful and rapid-fire gaming streamer style' }
];

const PLAYBACK_SPEEDS = [0.25, 0.5, 1.0, 1.25, 1.5, 2.0];

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function pcmToWav(pcmData: Uint8Array, sampleRate: number): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);
  return new Blob([header, pcmData], { type: 'audio/wav' });
}

const ContentExpander: React.FC<Props> = ({ summary, expandedData, setExpandedData, onShowToast }) => {
  const [loading, setLoading] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [activeType, setActiveType] = useState<'image' | 'video' | 'sns'>('image');
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<ProjectReport | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState('photorealistic');
  const [selectedStyleId, setSelectedStyleId] = useState(0);

  const [selectedGoogleVoice, setSelectedGoogleVoice] = useState('Zephyr');
  const [selectedStylePresetId, setSelectedStylePresetId] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 스크립트 텍스트 정제 함수
  const formatScriptForReader = (text: string) => {
    if (!text) return "";

    let cleaned = text
      .replace(/\[제목\]/g, '') // 1. "[제목]" 이라는 글자를 찾아 삭제
      .replace(/\\n/g, '\n')    // 2. 리터럴 줄바꿈 문자 변환
      .trim();

    // 3. 숫자 뒤에 줄바꿈 강제 삽입 (1. 2. 3. 등 항목별 줄바꿈)
    // 마침표(.) 뒤에 공백이 있고 바로 숫자가 나오는 패턴을 찾아 줄바꿈 삽입
    cleaned = cleaned.replace(/([.!?])\s+(\d+\.)/g, '$1\n\n$2');

    return cleaned;
  };

  useEffect(() => {
    if (activeType === 'video') {
      if (expandedData.image) {
        const { title, body } = expandedData.image.cardData;
        const formattedText = `[제목] ${title}\n\n${body}`;
        if (!expandedData.video || expandedData.video === summary || expandedData.video === '') {
           setExpandedData(prev => ({ ...prev, video: formattedText }));
        }
      } else if (summary && (!expandedData.video || expandedData.video === '')) {
        setExpandedData(prev => ({ ...prev, video: summary }));
      }
    }
  }, [activeType, expandedData.image, summary]);

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleDownloadAudio = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `trendpulse_audio_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast("오디오 파일이 저장되었습니다.");
  };

  const handleTTS = useCallback(async () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    // TTS를 보낼 때는 정제된 텍스트를 사용
    const textToRead = formatScriptForReader(expandedData.video || "");
    if (!textToRead.trim()) {
      onShowToast("낭독할 텍스트가 없습니다.");
      return;
    }
    setLoading(true);
    try {
      const styleInstruction = selectedStylePresetId !== null 
        ? STYLE_PRESETS.find(p => p.id === selectedStylePresetId)?.instruction 
        : undefined;
      const base64Audio = await generateTTS(textToRead, selectedGoogleVoice, styleInstruction);
      const audioBytes = decodeBase64(base64Audio);
      const wavBlob = pcmToWav(audioBytes, 24000);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.playbackRate = playbackRate;
        audioRef.current.onloadedmetadata = () => {
          audioRef.current?.play().catch(e => console.error("Playback failed:", e));
          setIsSpeaking(true);
        };
      }
    } catch (err) {
      console.error("TTS Generation Error:", err);
      onShowToast("음성 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [expandedData.video, isSpeaking, selectedGoogleVoice, selectedStylePresetId, playbackRate, onShowToast]);

  const handleExpand = async () => {
    if (activeType === 'video') {
      handleTTS();
      return;
    }
    setLoading(true);
    const stylePrompt = IMAGE_STYLES.find(s => s.id === selectedStyleId)?.prompt;
    try {
      const rawResponse = await generateExpandedContent(summary, activeType, stylePrompt);
      if (activeType === 'image') {
        try {
          const parsed = JSON.parse(rawResponse);
          const imgData = await generateImage(parsed.image_prompt, stylePrompt);
          setExpandedData(prev => ({ 
            ...prev, 
            image: { 
              img: imgData || '', 
              cardData: { title: parsed.news_title, body: parsed.news_body } 
            } 
          }));
          onShowToast("새로운 카드뉴스가 생성되었습니다.");
        } catch (e) {
          console.error(e);
        }
      } else if (activeType === 'sns') {
        setExpandedData(prev => ({ ...prev, sns: rawResponse }));
      }
    } catch (error) {
      onShowToast("콘텐츠 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImageOnly = async () => {
    if (isRegeneratingImage || !expandedData.image) return;
    setIsRegeneratingImage(true);
    onShowToast("🔄 테마를 적용하여 이미지를 재생성합니다...");
    try {
      const stylePrompt = IMAGE_STYLES.find(s => s.id === selectedStyleId)?.prompt;
      const { title, body } = expandedData.image.cardData;
      const variationPrompt = `Generate a cinematic news background for: ${title}. ${body.substring(0, 100)}. Professional quality, no text. Style requirement: ${stylePrompt || 'modern cinematic'}`;
      const newImgUrl = await generateImage(variationPrompt, stylePrompt);
      if (newImgUrl) {
        setExpandedData(prev => ({ 
          ...prev, 
          image: prev.image ? { ...prev.image, img: newImgUrl } : null 
        }));
        onShowToast("✅ 이미지가 새로운 스타일로 교체되었습니다!");
      } else {
        throw new Error("Failed to generate image");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ 이미지 재생성에 실패했습니다.");
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const generateReport = () => {
    const fullContent = [expandedData.image?.cardData.body, expandedData.video, expandedData.sns].filter(Boolean).join("\n\n---\n\n");
    if (!fullContent) return;
    const report = formatProjectReport(
      { domain: "TrendPulse Engine", summary: summary.substring(0, 100) + "..." },
      summary,
      fullContent
    );
    setReportData(report);
    setShowReport(true);
  };

  return (
    <div className="mt-8 border-t border-slate-700 pt-6 space-y-8">
      <audio ref={audioRef} hidden />
      
      <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
        <Sparkles size={16} className="animate-pulse" />
        <span>OSMU 콘텐츠 허브</span>
      </h3>
      
      <nav className="grid grid-cols-3 gap-3">
        <button onClick={() => setActiveType('image')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${activeType === 'image' ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' : 'bg-slate-800/30 border-slate-700 text-slate-500 hover:bg-slate-800'}`}>
          <ImageIcon className="mb-2" size={20} />
          <span className="text-[12px] font-black uppercase tracking-wider">카드뉴스 제작</span>
        </button>
        <button onClick={() => setActiveType('video')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${activeType === 'video' ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/10' : 'bg-slate-800/30 border-slate-700 text-slate-500 hover:bg-slate-800'}`}>
          <Mic2 className="mb-2" size={20} />
          <span className="text-[12px] font-black uppercase tracking-wider">카드뉴스 낭독기</span>
        </button>
        <button onClick={() => setActiveType('sns')} className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${activeType === 'sns' ? 'bg-pink-600/20 border-pink-500 text-white shadow-lg shadow-pink-500/10' : 'bg-slate-800/30 border-slate-700 text-slate-500 hover:bg-slate-800'}`}>
          <Share2 className="mb-2" size={20} />
          <span className="text-[12px] font-black uppercase tracking-wider">소셜 바이럴</span>
        </button>
      </nav>

      {activeType === 'image' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          {expandedData.image ? (
            <section className="bg-black/20 rounded-[2.5rem] p-8 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-6">
                <ImageIcon size={16} className="text-indigo-400" />
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">실시간 카드뉴스 프리뷰</span>
              </div>
              <CardNewsGenerator 
                imageUrl={expandedData.image.img} 
                summary={expandedData.image.cardData.body} 
                headline={expandedData.image.cardData.title} 
                isRegeneratingImage={isRegeneratingImage}
                onShowToast={onShowToast}
                onHeadlineChange={(val) => setExpandedData(prev => ({
                  ...prev, image: prev.image ? { ...prev.image, cardData: { ...prev.image.cardData, title: val } } : null
                }))}
                onSummaryChange={(val) => setExpandedData(prev => ({
                  ...prev, image: prev.image ? { ...prev.image, cardData: { ...prev.image.cardData, body: val } } : null
                }))}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedStyleId={selectedStyleId}
                setSelectedStyleId={setSelectedStyleId}
                onRegenerate={handleRegenerateImageOnly}
              />
            </section>
          ) : (
            <div className="space-y-6">
              <div className="bg-[#1a1a1a]/60 rounded-2xl p-8 border border-white/5 shadow-inner text-center">
                <Palette size={48} className="mx-auto text-indigo-500 mb-4 opacity-50" />
                <h4 className="text-xl font-black text-white mb-2">카드뉴스 디자인을 시작하세요</h4>
                <p className="text-slate-400 text-sm mb-8">원하는 스타일을 선택하고 하단 버튼을 누르면 AI가 최적의 이미지를 생성합니다.</p>
                
                <div className="flex flex-wrap gap-2 mb-4 p-[10px] justify-center">
                  {IMAGE_STYLE_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-5 py-2.5 rounded-xl text-[11px] font-black whitespace-nowrap transition-all border ${selectedCategory === cat.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>{cat.name}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 p-[10px] max-h-[400px] overflow-y-auto custom-scrollbar-thin justify-center max-w-2xl mx-auto bg-slate-900/20 rounded-2xl border border-slate-800/30">
                  {IMAGE_STYLES.filter(style => {
                    const cat = IMAGE_STYLE_CATEGORIES.find(c => c.id === selectedCategory);
                    return cat && style.id >= cat.range[0] && style.id <= cat.range[1];
                  }).map(style => (
                    <button key={style.id} onClick={() => setSelectedStyleId(style.id)} className={`px-5 py-3 rounded-xl text-[12px] font-bold transition-all border ${selectedStyleId === style.id ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>{style.label}</button>
                  ))}
                </div>

                <button 
                  onClick={handleExpand} 
                  disabled={loading}
                  className="w-full max-w-md mx-auto mt-8 py-6 rounded-2xl font-black text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Zap size={24} /> ✨ AI 카드뉴스 생성 시작</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeType === 'video' && (
        <div className="w-full bg-[#1a1a1a]/60 rounded-[2.5rem] p-8 border border-purple-500/20 shadow-2xl animate-in fade-in duration-500">
          <header className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-600/20 rounded-xl text-purple-400">
                <AudioLines size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Google AI 전용 성우 낭독기</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Powered by Gemini 2.5 Flash TTS</p>
              </div>
            </div>
          </header>

          <div className="space-y-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest">
                <Mic2 size={14} /> 🎙️ 성우 선택 (Google Voice)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {GOOGLE_AI_VOICES.map((v) => (
                  <button key={v.id} onClick={() => setSelectedGoogleVoice(v.id)} className={`flex flex-col p-4 rounded-2xl border transition-all text-left ${selectedGoogleVoice === v.id ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                    <span className="text-sm font-black mb-1">{v.label}</span>
                    <span className="text-[9px] opacity-70 leading-tight">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest">
                <Activity size={14} /> 🎭 감정/스타일 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {STYLE_PRESETS.map((preset) => (
                  <button key={preset.id} onClick={() => setSelectedStylePresetId(preset.id)} className={`py-3 px-3 rounded-xl text-[10px] font-bold border transition-all text-center ${selectedStylePresetId === preset.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'}`}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-4 border-t border-white/5">
              <div className="space-y-6">
                <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5">
                  <p className="text-[11px] text-slate-500 font-bold mb-4 uppercase tracking-widest">현재 설정 요약</p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-white">
                      <User size={14} className="text-purple-400" />
                      <span className="text-sm font-bold">{selectedGoogleVoice}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <Zap size={14} className="text-indigo-400" />
                      <span className="text-sm font-bold">{selectedStylePresetId !== null ? STYLE_PRESETS[selectedStylePresetId].label : '기본 스타일'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleTTS} disabled={loading} className={`flex-1 py-6 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 ${isSpeaking ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                    {loading ? <Loader2 className="animate-spin" /> : isSpeaking ? <><Square size={24} /> ⏹ 낭독 중단</> : <><Play size={24} /> 🔊 Google AI 낭독 시작</>}
                  </button>
                  <button onClick={handleDownloadAudio} disabled={!audioUrl} className={`px-8 py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-2xl ${audioUrl ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-800/30 text-slate-600 cursor-not-allowed'}`}>
                    <Download size={24} />
                  </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-[11px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest">
                    <Gauge size={14} /> 재생 속도
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLAYBACK_SPEEDS.map((speed) => (
                      <button key={speed} onClick={() => handleSpeedChange(speed)} className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all border ${playbackRate === speed ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                        {speed === 1.0 ? 'Normal' : `${speed}x`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest"><FileText size={14} /> 낭독 스크립트 수정</label>
                <textarea 
                  value={formatScriptForReader(expandedData.video || "")} 
                  onChange={(e) => setExpandedData(prev => ({ ...prev, video: e.target.value }))} 
                  className="w-full h-[280px] bg-slate-900/50 p-6 rounded-2xl border border-slate-800 text-slate-300 text-sm leading-relaxed focus:border-purple-500/50 outline-none custom-scrollbar-thin" 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeType === 'sns' && (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
          <div className="bg-[#1a1a1a]/60 rounded-2xl p-6 border border-white/5 shadow-inner">
            <button onClick={handleExpand} disabled={loading} className="w-full py-5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-black text-base transition-all flex items-center justify-center gap-2 shadow-xl">
              <Share2 size={20} /> 📱 인스타그램/트위터용 문구 자동 생성
            </button>
          </div>
          {expandedData.sns && (
            <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-700/50 text-slate-200 text-sm italic leading-relaxed whitespace-pre-wrap">
              {expandedData.sns}
              <button onClick={() => { navigator.clipboard.writeText(expandedData.sns || ''); onShowToast('문구가 복사되었습니다!'); }} className="mt-6 w-full py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[11px] font-black uppercase tracking-widest text-white">문구 복사하기</button>
            </div>
          )}
        </div>
      )}

      {(expandedData.image || expandedData.video || expandedData.sns) && (
        <div className="mt-16 flex justify-center pb-12">
          <button onClick={generateReport} className="px-16 py-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] text-lg font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-2xl active:scale-95">
            <ClipboardList size={24} /> 최종 통합 프로젝트 리포트 발행
          </button>
        </div>
      )}

      {showReport && reportData && <ProjectReportView reportData={reportData} onClose={() => setShowReport(false)} />}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar-thin::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default ContentExpander;
