
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Search, 
  BrainCircuit, 
  Loader2, 
  LayoutDashboard, 
  Zap, 
  Globe, 
  Key,
  Database,
  Palette,
  X,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  ShieldAlert,
  ExternalLink,
  Save
} from 'lucide-react';
import { GeminiTrendService } from './services/geminiService';
import { AppState, NewsItem } from './types';
import { NewsCard } from './components/NewsCard';
import ContentExpander from './components/ContentExpander';
import SavedCards from './components/SavedCards';
import ChatWidget from './ChatWidget';

type ThemeType = 'aurora' | 'midnight' | 'obsidian';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights'>('dashboard');
  const [theme, setTheme] = useState<ThemeType>('aurora');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  const [newsSources, setNewsSources] = useState<NewsItem[]>([]);
  
  const [state, setState] = useState<AppState>({
    keyword: '', 
    isLoading: false,
    results: [], 
    analysis: null,
    error: null,
  });

  const [expandedContent, setExpandedContent] = useState({
    image: null as { img: string; cardData: { title: string; body: string } } | null,
    video: null as string | null,
    sns: null as string | null,
  });

  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const [chatCommand, setChatCommand] = useState<{ text: string; time: number } | null>(null);

  const showToast = (message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast({ visible: false, message: '' }), 2500);
  };

  // 앱 초기 로드 시 localStorage에서 키를 불러와 전역 환경 변수에 주입
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey && typeof window !== 'undefined') {
      const win = window as any;
      win.process = win.process || { env: {} };
      win.process.env = win.process.env || {};
      win.process.env.API_KEY = savedKey;
    }
  }, []);

  // API 키 저장 핸들러
  const handleSaveApiKey = () => {
    const trimmedKey = tempApiKey.trim();
    if (!trimmedKey) {
      showToast("API 키를 입력해주세요.");
      return;
    }
    
    // 1. LocalStorage 저장
    localStorage.setItem('gemini_api_key', trimmedKey);
    
    // 2. 전역 process.env 업데이트 (신규 생성되는 Gemini SDK 인스턴스가 즉시 사용 가능하도록)
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.process = win.process || { env: {} };
      win.process.env.API_KEY = trimmedKey;
    }
    
    showToast("API 키가 성공적으로 저장되었습니다.");
    setIsKeyModalOpen(false);
    setState(prev => ({ ...prev, error: null }));
  };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    // 폼 제출 이벤트 전파 및 기본 동작(새로고침)을 확실히 차단
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const targetKeyword = state.keyword;
    if (!targetKeyword.trim()) return;

    // API 키 존재 여부 강제 확인 (LocalStorage 직접 조회)
    const savedKey = localStorage.getItem('gemini_api_key');
    const currentApiKey = savedKey || (window as any).process?.env?.API_KEY;
    
    if (!currentApiKey) {
      setTempApiKey('');
      setIsKeyModalOpen(true);
      return;
    }

    // 이미 로딩 중이면 중복 실행 방지
    if (state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, results: [], analysis: null }));
    setNewsSources([]); 
    setExpandedContent({ image: null, video: null, sns: null }); 
    setActiveTab('dashboard');
    
    try {
      const service = new GeminiTrendService();
      const { news, analysis } = await service.fetchTrendsAndAnalysis(targetKeyword);
      
      setState(prev => ({ ...prev, results: news, analysis, isLoading: false }));
      
      if (news && news.length > 0) {
        setNewsSources(news);
      } else {
        setNewsSources([
          { 
            title: `${targetKeyword} 관련 실시간 뉴스 보도`, 
            uri: `https://www.google.com/search?q=${encodeURIComponent(targetKeyword)}&tbm=nws`, 
            source: "Google News" 
          }
        ]);
      }
    } catch (err: any) {
      console.error("Search Analysis Error:", err);
      setState(prev => ({ ...prev, isLoading: false, error: err.message || '오류 발생' }));
      showToast("분석 엔진 호출에 실패했습니다. API 키와 네트워크를 확인해주세요.");
    }
  }, [state.keyword, state.isLoading]);

  const getThemeStyles = () => {
    switch(theme) {
      case 'aurora':
        return {
          background: 'radial-gradient(circle at 10% 20%, rgb(20, 20, 60) 0%, rgb(10, 10, 20) 90%)',
          card: 'bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]',
          sidebar: 'bg-black/60 backdrop-blur-2xl border-r border-white/5',
          accent: 'text-indigo-400'
        };
      case 'midnight':
        return {
          background: 'linear-gradient(to bottom right, #020617, #0f172a)',
          card: 'bg-slate-900/60 backdrop-blur-lg border border-slate-800 shadow-xl',
          sidebar: 'bg-slate-950/80 border-r border-slate-800',
          accent: 'text-blue-400'
        };
      case 'obsidian':
        return {
          background: '#0a0a0a',
          card: 'bg-[#111] border border-white/5 shadow-2xl',
          sidebar: 'bg-[#050505] border-r border-white/5',
          accent: 'text-slate-200'
        };
    }
  };

  const parseInsights = (text: string) => {
    if (!text) return [];
    let processedText = text.replace(/\\n/g, '\n');
    processedText = processedText.replace(/([.!?])\s*(\d+\.)/g, '$1\n\n$2');
    processedText = processedText
      .replace(/\[제목\]/g, '')
      .replace(/\(참조:[\s\S]*?\)/gi, '')
      .replace(/https?:\/\/[^\s\)]+/g, '')
      .replace(/\*\*/g, '')
      .trim();

    return processedText.split('\n')
      .map(line => line.trim())
      .filter(line => /^\d+\.\s/.test(line) && line.length > 5);
  };

  const handleDiscussWithAI = () => {
    if (!state.analysis) return;
    setChatCommand({
      text: `"${state.keyword}" 트렌드 분석 결과에 대해 더 자세히 설명해줘.`,
      time: Date.now()
    });
  };

  const themeStyle = getThemeStyles();

  return (
    <div className="flex h-screen text-white overflow-hidden relative" style={{ background: themeStyle.background }}>
      {theme === 'aurora' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute w-[800px] h-[800px] rounded-full bg-[#7c3aed] blur-[160px] opacity-[0.15] -top-60 -left-60 animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute w-[1000px] h-[1000px] rounded-full bg-[#06b6d4] blur-[180px] opacity-[0.1] -bottom-80 -right-80 animate-pulse" style={{ animationDuration: '15s' }} />
        </div>
      )}

      <aside className={`w-72 flex flex-col z-30 ${themeStyle.sidebar} transition-all duration-500`}>
        <div className="p-8">
          <div className="flex items-center gap-4 mb-14">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl flex items-center justify-center font-black text-white shadow-2xl shadow-indigo-500/30">
              TP
            </div>
            <div>
              <span className="text-2xl font-black tracking-tighter block leading-none">TrendPulse</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 block">Intelligent OS Hub</span>
            </div>
          </div>

          <nav className="space-y-3">
            <button 
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all text-sm ${activeTab === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400 shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <LayoutDashboard size={20} /> 대시보드
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('insights')}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all text-sm ${activeTab === 'insights' ? 'bg-indigo-600/20 text-indigo-400 shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <Database size={20} /> DB 보관함
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 space-y-4 border-t border-white/5">
          <button 
            type="button"
            onClick={() => setShowThemeModal(true)}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-slate-500 hover:text-indigo-400 hover:bg-white/10 transition-all text-sm group"
          >
            <Palette size={20} className="group-hover:rotate-12 transition-transform" /> 디자인 테마 설정
          </button>
          <button 
            type="button"
            onClick={() => {
              const currentKey = localStorage.getItem('gemini_api_key') || '';
              setTempApiKey(currentKey);
              setIsKeyModalOpen(true);
            }}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-slate-500 hover:text-amber-400 hover:bg-white/10 transition-all text-sm group"
          >
            <Key size={20} className="group-hover:scale-110 transition-transform" /> API 키 관리
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <header className="sticky top-0 z-40 bg-transparent px-12 py-10 flex items-center gap-8">
          <div className="relative flex-1 max-w-4xl">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <input 
                type="text" 
                placeholder="트렌드 키워드를 입력하고 엔터를 누르세요..." 
                className={`w-full ${themeStyle.card} rounded-3xl py-5 pl-16 pr-16 text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600 font-bold text-xl shadow-2xl`}
                value={state.keyword}
                onChange={(e) => setState(prev => ({ ...prev, keyword: e.target.value }))}
                disabled={state.isLoading}
              />
              {/* 돋보기 버튼: type="submit"으로 설정하여 명시적인 클릭 이벤트를 보장합니다. */}
              <button 
                type="submit" 
                title="검색 실행"
                className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors z-50 pointer-events-auto p-2"
                disabled={state.isLoading}
              >
                <Search size={26} />
              </button>
              {state.isLoading && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <Loader2 className="animate-spin text-indigo-500" size={26} />
                </div>
              )}
            </form>
          </div>
        </header>

        <div className="px-12 pb-24 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-12 gap-12">
            <section className="col-span-12 xl:col-span-8 space-y-12">
              {activeTab === 'dashboard' ? (
                <>
                  {state.analysis ? (
                    <div className={`${themeStyle.card} rounded-[3.5rem] p-14 shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-1000`}>
                      <div className="flex items-center justify-between mb-14">
                        <div className="flex items-center gap-5 text-indigo-400 font-black text-3xl uppercase tracking-tighter">
                          <BrainCircuit size={40} className="animate-pulse" />
                          <span>AI Intelligence Insights</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            type="button"
                            onClick={handleDiscussWithAI}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl transition-all font-black text-xs group"
                          >
                            <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
                            AI 비서와 심층 분석
                          </button>
                          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                            <Sparkles size={16} className="text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Gemini 3 Pro Powered</span>
                          </div>
                        </div>
                      </div>
                      
                      <article className="text-white/90 text-2xl leading-[2] whitespace-pre-wrap mb-16 font-medium">
                        {parseInsights(state.analysis.summary).map((line, i) => (
                          <p key={i} className="mb-8 last:mb-0 bg-white/5 p-8 rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-300 shadow-inner">
                            {line}
                          </p>
                        ))}
                      </article>

                      <ContentExpander 
                        summary={state.analysis.summary} 
                        expandedData={expandedContent}
                        setExpandedData={setExpandedContent}
                        onShowToast={showToast}
                      />
                    </div>
                  ) : (
                    !state.isLoading && (
                      <div className="flex flex-col items-center justify-center py-48 text-center bg-white/5 rounded-[4rem] border border-white/5">
                        <div className="w-36 h-36 bg-indigo-500/10 rounded-[3.5rem] flex items-center justify-center mb-12 border border-indigo-500/20 shadow-2xl animate-bounce" style={{ animationDuration: '3s' }}>
                          <Zap size={72} className="text-indigo-500" />
                        </div>
                        <h1 className="text-8xl font-black mb-10 tracking-tighter text-white">OSMU Hub</h1>
                        <p className="text-slate-500 max-w-2xl mx-auto text-2xl font-bold leading-relaxed">키워드 입력 시 실시간 뉴스 그라운딩 기반의 인텔리전스 리포트와 카드뉴스, 성우 낭독 콘텐츠를 생성합니다.</p>
                      </div>
                    )
                  )}
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-12 duration-800">
                  <h2 className="text-5xl font-black mb-14 flex items-center gap-5 tracking-tighter">
                    <Database className="text-indigo-500" size={56} /> DB 보관함
                  </h2>
                  <SavedCards />
                </div>
              )}
            </section>

            <aside className="col-span-12 xl:col-span-4 space-y-12">
              <div className={`${themeStyle.card} rounded-[3rem] p-10 shadow-2xl sticky top-40 transition-all duration-500`}>
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black flex items-center gap-4">
                    <Globe className="text-indigo-400" size={32} /> 실시간 소스 피드
                  </h3>
                  {newsSources.length > 0 && (
                    <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {newsSources.length} Results
                    </span>
                  )}
                </div>
                <div className="space-y-6 max-h-[900px] overflow-y-auto custom-scrollbar pr-4">
                  {newsSources.length > 0 ? newsSources.map((item, idx) => (
                    <NewsCard key={`${idx}-${item.uri}`} item={item} />
                  )) : state.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                      <Loader2 className="animate-spin text-indigo-500" size={48} />
                      <p className="text-slate-400 font-black uppercase tracking-widest text-[11px]">Searching web...</p>
                    </div>
                  ) : (
                    <div className="text-center py-24 opacity-30 border-2 border-dashed border-white/10 rounded-[2.5rem]">
                      <Search size={48} className="mx-auto mb-4" />
                      <p className="text-slate-400 font-bold text-lg">분석을 기다리는 중...</p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* 디자인 테마 설정 모달 */}
      {showThemeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6 animate-in fade-in duration-500">
          <div className="bg-[#1e293b] border border-white/10 rounded-[3rem] p-12 w-full max-w-3xl shadow-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full -mr-32 -mt-32" />
            <button onClick={() => setShowThemeModal(false)} className="absolute right-10 top-10 text-slate-500 hover:text-white transition-all z-10"><X size={32} /></button>
            <h2 className="text-4xl font-black mb-12 flex items-center gap-5 text-white tracking-tighter z-10 relative">
              <Palette className="text-indigo-400" size={44} /> 디자인 테마 설정
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 z-10 relative">
              {[
                { id: 'aurora', name: 'Aurora AI', desc: '고급스러운 오로라 그라데이션과 블러 효과', color: 'bg-gradient-to-br from-indigo-600 to-cyan-500' },
                { id: 'midnight', name: 'Midnight', desc: '깊은 심해의 블루와 차분한 레이아웃', color: 'bg-slate-800' },
                { id: 'obsidian', name: 'Obsidian', desc: '강렬하고 시크한 다크 미니멀리즘', color: 'bg-black' }
              ].map(t => (
                <button 
                  key={t.id}
                  type="button"
                  onClick={() => { setTheme(t.id as ThemeType); setShowThemeModal(false); }}
                  className={`flex flex-col p-8 rounded-[2.5rem] border-2 transition-all text-left group h-full ${theme === t.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                >
                  <div className={`w-16 h-16 rounded-2xl mb-8 shadow-2xl ${t.color} group-hover:scale-110 transition-transform duration-500`} />
                  <span className="text-xl font-black text-white mb-3">{t.name}</span>
                  <span className="text-[11px] text-slate-500 font-bold leading-relaxed">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API 키 관리 모달 (Vercel 배포 시 window.aistudio 의존성을 제거한 독립형 모달) */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6 animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-xl shadow-4xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600" />
            <button onClick={() => setIsKeyModalOpen(false)} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all z-10"><X size={28} /></button>
            
            <div className="mb-10 text-center">
              <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
                <Key size={36} className="text-amber-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-3 tracking-tighter">Gemini API 키 관리</h2>
              <p className="text-slate-400 text-sm font-medium">서비스 이용을 위해 Google AI Studio에서 발급받은 API 키가 필요합니다.</p>
            </div>

            <div className="space-y-8 relative z-10">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.15em]">Gemini API Key</label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] font-black text-indigo-400 flex items-center gap-1 hover:underline"
                  >
                    API 키 발급받기 <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative group">
                  <input 
                    type="password" 
                    placeholder="AI 키를 입력하세요 (예: AIzaSy...)" 
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 pl-6 pr-6 text-white font-mono text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveApiKey();
                    }}
                  />
                </div>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 flex gap-4 items-start">
                <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-1" />
                <div className="space-y-1.5">
                  <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Security Warning</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    입력하신 API 키는 브라우저의 로컬 저장소(LocalStorage)에 안전하게 저장되며, 어떠한 서버로도 전송되지 않습니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsKeyModalOpen(false)}
                  className="flex-1 py-4.5 rounded-2xl font-black text-sm text-slate-400 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                >
                  취소
                </button>
                <button 
                  type="button"
                  onClick={handleSaveApiKey}
                  className="flex-[2] py-4.5 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-500 shadow-2xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Save size={18} /> API 키 저장 및 적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 px-10 py-5 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-full shadow-3xl animate-in fade-in slide-in-from-bottom-8">
          <CheckCircle2 className="text-emerald-500" size={24} />
          <span className="text-base font-black text-white">{toast.message}</span>
        </div>
      )}

      <ChatWidget 
        analysis={state.analysis} 
        externalCommand={chatCommand}
        keyword={state.keyword}
      />
    </div>
  );
};

export default App;
