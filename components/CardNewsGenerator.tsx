
import React, { useRef, useEffect, useState } from 'react';
import { Download, Edit3, RefreshCw, Video, Loader2, Film, Clock, Sparkles, Palette, Zap, Database, Type } from 'lucide-react';
import { generateVideoWithVeo } from '../services/geminiService';
import { IMAGE_STYLE_CATEGORIES, IMAGE_STYLES } from '../constants/imageStyles';
import html2canvas from 'html2canvas';

interface Props {
  imageUrl: string;
  summary: string;
  headline: string;
  onHeadlineChange: (val: string) => void;
  onSummaryChange: (val: string) => void;
  isRegeneratingImage?: boolean;
  onShowToast?: (msg: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedStyleId: number;
  setSelectedStyleId: (id: number) => void;
  onRegenerate: () => void;
}

// 폰트 리스트 (작업지시서 기반 20종 확장)
const FONT_OPTIONS = [
  // 고딕/샌스 세리프 (신뢰감, 뉴스 스타일)
  { name: '노토산스 KR', family: "'Noto Sans KR', sans-serif" },
  { name: '나눔고딕', family: "'Nanum Gothic', sans-serif" },
  { name: '프리텐다드', family: "'Pretendard', sans-serif" },
  { name: 'G마켓 산스', family: "'GmarketSansMedium', sans-serif" },
  { name: '에스코어 드림', family: "'S-CoreDream-4Regular', sans-serif" },
  { name: '검은고딕', family: "'Black Han Sans', sans-serif" },
  { name: 'IBM Plex Sans KR', family: "'IBM Plex Sans KR', sans-serif" },

  // 명조/세리프 (우아함, 감성 스타일)
  { name: '나눔명조', family: "'Nanum Myeongjo', serif" },
  { name: '본명조', family: "'Noto Serif KR', serif" },
  { name: '바탕체', family: "'Batang', serif" },
  { name: '송명', family: "'Song Myung', serif" },

  // 손글씨/디스플레이 (친근함, SNS 스타일)
  { name: '나눔손글씨 펜', family: "'Nanum Pen Script', cursive" },
  { name: '나눔손글씨 붓', family: "'Nanum Brush Script', cursive" },
  { name: '가비아 온해', family: "'Gaegu', cursive" },
  { name: '동글', family: "'Dongle', sans-serif" },
  { name: '배달의민족 주아', family: "'Jua', sans-serif" },
  { name: '배달의민족 도현', family: "'Do Hyeon', sans-serif" },
  { name: '배달의민족 연성', family: "'Yeon Sung', cursive" },
  { name: '고도체', family: "'Godo', sans-serif" },
  { name: '카페24 써라운드', family: "'Cafe24Ssurround', sans-serif" }
];

const CardNewsGenerator: React.FC<Props> = ({ 
  imageUrl, 
  summary, 
  headline, 
  onHeadlineChange, 
  onSummaryChange, 
  isRegeneratingImage, 
  onShowToast,
  selectedCategory,
  setSelectedCategory,
  selectedStyleId,
  setSelectedStyleId,
  onRegenerate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recordingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isImgLoaded, setIsImgLoaded] = useState(false);
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isVeoLoading, setIsVeoLoading] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);

  const [localWatermark, setLocalWatermark] = useState('실시간 뉴스 리포트');

  // 텍스트 스타일 상태 추가
  const [headlineSize, setHeadlineSize] = useState(88);
  const [bodySize, setBodySize] = useState(42);
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].family);

  // [수정 로직: 중복 번호 방지 스마트 파싱]
  const formatPreviewText = (text: string) => {
    if (!text) return "";

    // 1. 역슬래시 n(\n) 문자를 실제 줄바꿈으로 변환 및 불필요한 태그 제거
    let processedText = text.replace(/\\n/g, '\n')
      .replace(/\[제목\]/g, '')
      .replace(/[\*\#\[\]]/g, "")
      .replace(/\(참조:[\s\S]*?\)/gi, '')
      .replace(/https?:\/\/[^\s\)]+/g, '')
      .trim();

    // 2. [핵심] 숫자 번호(1. 2. 3.) 직전에 강제로 줄바꿈 삽입 (문장 중간에 번호가 뭉쳐있을 경우 대비)
    processedText = processedText.replace(/([.!?])\s*(\d+\.)/g, '$1\n$2');

    // 3. 줄바꿈으로 나누어 각 줄 처리
    const lines = processedText.split('\n');
    const processedLines = lines
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // 4. '숫자.'으로 시작하지 않는 줄은 이전 줄에 강제로 붙여 문장 잘림 방지
    let finalLines: string[] = [];
    processedLines.forEach((line) => {
      if (/^\d+\./.test(line)) {
        finalLines.push(line);
      } else if (finalLines.length > 0) {
        finalLines[finalLines.length - 1] += " " + line;
      } else {
        finalLines.push(line);
      }
    });

    // 5. 결과 출력 (각 번호 사이에는 확실하게 한 줄씩 띄움)
    return finalLines.join('\n\n');
  };

  const cleanText = (text: string) => {
    return text.replace(/[\*\#\[\]]/g, "").replace(/\s\s+/g, ' ').trim();
  };

  const drawCardNewsOnCanvas = (canvas: HTMLCanvasElement, scaleFactor: number = 1.0) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    const draw = () => {
      canvas.width = 1080;
      canvas.height = 1920;
      const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const currentScale = baseScale * scaleFactor;
      const dw = img.width * currentScale;
      const dh = img.height * currentScale;
      const dx = (canvas.width - dw) / 2;
      const dy = (canvas.height - dh) / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; 
      ctx.fillRect(0, 0, 1080, 1920);
      ctx.fillStyle = 'white';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;
      const maxWidth = 920;
      const startX = 80;

      // 폰트 적용
      ctx.font = `bold ${headlineSize}px ${selectedFont}`;
      const displayHeadline = cleanText(headline);
      const headlineWords = displayHeadline.split(' ');
      let headlineLine = '';
      let headlineY = 240; 
      for (let n = 0; n < headlineWords.length; n++) {
        let testLine = headlineLine + headlineWords[n] + ' ';
        if (ctx.measureText(testLine).width > maxWidth && n > 0) {
          ctx.fillText(headlineLine, startX, headlineY);
          headlineLine = headlineWords[n] + ' ';
          headlineY += (headlineSize * 1.2);
        } else {
          headlineLine = testLine;
        }
      }
      ctx.fillText(headlineLine, startX, headlineY);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#6366f1';
      ctx.fillRect(startX, headlineY + 45, 180, 10);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';

      // 본문 폰트 적용 - 수정된 스마트 파싱 로직 사용
      ctx.font = `500 ${bodySize}px ${selectedFont}`;
      const lineHeight = bodySize * 1.6;
      let contentY = headlineY + 150; 
      
      const formattedSummary = formatPreviewText(summary);
      const sections = formattedSummary.split('\n\n').filter(s => s.trim());
      
      for (const section of sections) {
        const words = section.trim().split(' ');
        let currentLine = '';
        for (let word of words) {
          let testLine = currentLine + word + ' ';
          if (ctx.measureText(testLine).width > maxWidth) {
            ctx.fillText(currentLine, startX, contentY);
            currentLine = word + ' ';
            contentY += lineHeight;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine.trim()) {
          ctx.fillText(currentLine, startX, contentY);
          contentY += lineHeight + (bodySize * 0.8);
        }
      }
      const today = new Date().toLocaleDateString('ko-KR');
      ctx.font = `bold 30px ${selectedFont}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'left';
      ctx.fillText(localWatermark, startX, 1860);
      ctx.textAlign = 'right';
      ctx.fillText(today, 1080 - startX, 1860);
    };
    if (img.complete) {
      draw();
    } else {
      img.onload = draw;
    }
  };

  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      drawCardNewsOnCanvas(canvasRef.current);
      setIsImgLoaded(true);
    }
  }, [imageUrl, headline, summary, localWatermark, headlineSize, bodySize, selectedFont]);

  const handleCreateVeoVideo = async () => {
    if (isVeoLoading) return;
    setIsVeoLoading(true);
    setVideoUrl(null);
    if (onShowToast) onShowToast("🚀 Veo AI가 고품질 비디오를 생성 중입니다...");
    try {
      const url = await generateVideoWithVeo(headline, imageUrl);
      if (url) {
        setVideoUrl(url);
        if (onShowToast) onShowToast("✅ AI 비디오 생성이 완료되었습니다!");
      }
    } catch (e) {
      if (onShowToast) onShowToast("비디오 생성 중 오류가 발생했습니다.");
    } finally {
      setIsVeoLoading(false);
    }
  };

  const downloadCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `TrendPulse_CardNews_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const handleSaveDB = async (e?: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return alert("이미지 캔버스를 찾을 수 없습니다.");

    try {
      const mergedImageUrl = canvas.toDataURL('image/png');

      const newCard = {
        id: Date.now(),
        imageUrl: mergedImageUrl,
        date: new Date().toLocaleDateString(),
        title: headline || "무제",
        headline: headline || "무제",
        body: summary,
        content: summary,
        description: summary,
        text: summary,
        originalBody: summary
      };

      const rawData = localStorage.getItem('saved_cards');
      const list = rawData ? JSON.parse(rawData) : [];
      list.unshift(newCard); 
      localStorage.setItem('saved_cards', JSON.stringify(list));

      alert("✅ 카드뉴스가 '설정하신 스타일 그대로' 저장되었습니다!");
      if (onShowToast) onShowToast("✅ DB 보관함에 저장되었습니다.");
    } catch (err) {
      console.error(err);
      alert("이미지 저장 중 오류가 발생했습니다.");
    }
  };

  const handleCreateMotionVideo = async () => {
    if (isGeneratingVideo) return;
    setIsGeneratingVideo(true);
    setVideoUrl(null);
    setRecordingProgress(0);
    const canvas = recordingCanvasRef.current;
    if (!canvas) return;
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    
    if (!('captureStream' in canvas)) {
        if (onShowToast) onShowToast("이 브라우저에서는 비디오 캡처를 지원하지 않습니다.");
        setIsGeneratingVideo(false);
        return;
    }

    const stream = (canvas as any).captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 5000000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsGeneratingVideo(false);
      if (onShowToast) onShowToast("✅ 모션 비디오 생성이 완료되었습니다!");
    };
    recorder.start();

    let startTime = performance.now();
    const duration = 4000; 
    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setRecordingProgress(Math.round(progress * 100));
      const scale = 1.0 + progress * 0.1; 
      drawCardNewsOnCanvas(canvas, scale);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        recorder.stop();
      }
    };
    requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <div className="w-full lg:w-[450px] space-y-6">
        <div id="card-capture-area" className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/5 bg-slate-900 group" style={{ fontFamily: selectedFont }}>
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
          <canvas ref={recordingCanvasRef} className="hidden" />
          {isRegeneratingImage && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
              <Loader2 className="animate-spin text-indigo-500" size={64} />
              <p className="text-white font-black uppercase tracking-widest text-sm">이미지 스타일 재생성 중...</p>
            </div>
          )}
          {isGeneratingVideo && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-30">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle className="text-white/10 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                  <circle className="text-indigo-500 stroke-current" strokeWidth="8" strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * recordingProgress) / 100} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">{recordingProgress}%</div>
              </div>
              <p className="text-indigo-400 font-black uppercase tracking-widest text-xs animate-pulse">모션 비디오 인코딩 중...</p>
            </div>
          )}
          {isVeoLoading && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-30 p-10 text-center">
              <Film className="text-purple-500 animate-bounce" size={64} />
              <h4 className="text-xl font-black text-white">Veo AI 비디오 생성 중</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Gemini Veo 모델이 시네마틱 비디오를 생성하고 있습니다. 이 작업은 약 1~2분 정도 소요됩니다.</p>
              <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-purple-500 animate-[shimmer_2s_infinite]" style={{ width: '100%' }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={downloadCard} className="py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 border border-white/10 transition-all">
            <Download size={18} /> PNG 저장
          </button>
          <button onClick={handleSaveDB} className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all">
            <Database size={18} /> DB 보관
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-10">
        <div className="bg-slate-900/40 p-8 rounded-3xl border border-white/5 space-y-6">
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest"><Edit3 size={14} /> 헤드라인 편집</label>
            <input type="text" value={headline} onChange={(e) => onHeadlineChange(e.target.value)} className="w-full bg-slate-800/50 p-5 rounded-2xl border border-slate-700 text-white font-bold text-xl focus:border-indigo-500 outline-none" />
          </div>
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest"><Edit3 size={14} /> 본문 내용 편집</label>
            <textarea value={summary} onChange={(e) => onSummaryChange(e.target.value)} className="w-full h-48 bg-slate-800/50 p-5 rounded-2xl border border-slate-700 text-slate-300 text-sm leading-relaxed focus:border-indigo-500 outline-none resize-none custom-scrollbar-thin" />
          </div>
          
          <div className="pt-6 border-t border-white/5 space-y-6">
            <h4 className="text-sm font-bold text-indigo-400 flex items-center gap-2 uppercase tracking-widest">
              <Type size={16} /> 텍스트 스타일 상세 설정
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">글꼴 선택</label>
                <select 
                  value={selectedFont} 
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full bg-slate-800 text-white rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
                >
                  {FONT_OPTIONS.map(font => <option key={font.family} value={font.family}>{font.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">하단 워터마크</label>
                <input type="text" value={localWatermark} onChange={(e) => setLocalWatermark(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl border border-slate-700 text-slate-400 text-sm outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">헤드라인 크기</label>
                  <span className="text-xs font-bold text-indigo-400">{headlineSize}px</span>
                </div>
                <input 
                  type="range" min="40" max="140" value={headlineSize} 
                  onChange={(e) => setHeadlineSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">본문 크기</label>
                  <span className="text-xs font-bold text-indigo-400">{bodySize}px</span>
                </div>
                <input 
                  type="range" min="12" max="60" value={bodySize} 
                  onChange={(e) => setBodySize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 p-8 rounded-3xl border border-white/5 space-y-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
               <label className="text-[11px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest"><Palette size={14} /> 디자인 테마 설정</label>
               {imageUrl && (
                 <button 
                  onClick={onRegenerate} 
                  disabled={isRegeneratingImage}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[12px] font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                 >
                   <RefreshCw size={16} className={isRegeneratingImage ? 'animate-spin' : ''} /> 🔄 이미지 재생성
                 </button>
               )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {IMAGE_STYLE_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${selectedCategory === cat.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>{cat.name}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto custom-scrollbar-thin p-1 bg-black/20 rounded-2xl border border-white/5">
                {IMAGE_STYLES.filter(style => {
                  const cat = IMAGE_STYLE_CATEGORIES.find(c => c.id === selectedCategory);
                  return cat && style.id >= cat.range[0] && style.id <= cat.range[1];
                }).map(style => (
                  <button key={style.id} onClick={() => setSelectedStyleId(style.id)} className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all border ${selectedStyleId === style.id ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}>{style.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[11px] font-black text-slate-500 flex items-center gap-2 uppercase tracking-widest"><Video size={14} /> AI 비디오 확장 (OSMU)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={handleCreateMotionVideo} disabled={isGeneratingVideo} className="group relative p-6 bg-slate-800 hover:bg-slate-700 rounded-[2rem] border border-slate-700 transition-all text-left overflow-hidden">
               <div className="relative z-10">
                 <h5 className="text-white font-black text-lg mb-1 flex items-center gap-2"><Film size={20} className="text-indigo-400" /> 모션 그래픽스</h5>
                 <p className="text-slate-400 text-[10px] font-bold">이미지에 줌 인 효과를 더한 루프 비디오</p>
               </div>
               <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:opacity-20 transition-opacity"><Film size={100} /></div>
            </button>
            <button onClick={handleCreateVeoVideo} disabled={isVeoLoading} className="group relative p-6 bg-purple-900/20 hover:bg-purple-900/30 rounded-[2rem] border border-purple-500/20 transition-all text-left overflow-hidden">
               <div className="relative z-10">
                 <h5 className="text-white font-black text-lg mb-1 flex items-center gap-2"><Zap size={20} className="text-purple-400" /> Veo AI 시네마틱</h5>
                 <p className="text-slate-400 text-[10px] font-bold">Gemini Veo로 생성하는 고품질 AI 비디오</p>
               </div>
               <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:opacity-20 transition-opacity"><Sparkles size={100} /></div>
            </button>
          </div>
          {videoUrl && (
            <div className="mt-6 p-6 bg-indigo-600/10 rounded-[2.5rem] border border-indigo-500/30 animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><Clock size={14} /> 생성이 완료되었습니다</span>
                <a href={videoUrl} download="TrendPulse_Video.webm" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg">비디오 다운로드</a>
              </div>
              <video src={videoUrl} controls className="w-full rounded-2xl shadow-2xl" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardNewsGenerator;
