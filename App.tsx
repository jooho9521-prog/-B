
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
  MessageSquare
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

  const handleOpenKeySelector = async () => {
    try {
      if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
        setState(prev => ({ ...prev, error: null }));
      }
    } catch (err) {
      console.error("Key selection failed", err);
    }
  };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetKeyword = state.keyword;
    if (!targetKeyword.trim()) return;

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
      setState(prev => ({ ...prev, isLoading: false, error: err.message || '오류 발생' }));
    }
  }, [state.keyword]);

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

  // [수정된 파싱 로직] 번호가 뭉쳐있어도 강제로 줄을 나눕니다.
  const parseInsights = (text: string) => {
    if (!text) return [];

    // 1. 역슬래시 n(\\n) 글자를 실제 줄바꿈으로 치환
    let processedText = text.replace(/\\n/g, '\n');

    // 2. [핵심] 문장 중간에 " 2. " 처럼 번호가 나타나면 그 직전에 강제로 줄바꿈 삽입
    // 정규식 설명: (마침표/물음표/느낌표 뒤에) (공백이 있고) (숫자+점)이 오면 줄바꿈 추가
    processedText = processedText.replace(/([.!?])\s*(\d+\.)/g, '$1\n\n$2');

    // 3. 불필요한 참조 및 특수문자 정제
    processedText = processedText
      .replace(/\[제목\]/g, '')
      .replace(/\(참조:[\s\S]*?\)/gi, '')
      .replace(/https?:\/\/[^\s\)]+/g, '')
      .replace(/\*\*/g, '')
      .trim();

    // 4. 줄바꿈 기준으로 쪼개서 각 항목을 배열로 반환
    return processedText.split('\n')
      .map(line => line.trim())
      .filter(line => {
        // "1. " 형태의 번호로 시작하는 문장만 유효한 박스로 생성
        return /^\d+\.\s/.test(line) && line.length > 5;
      });
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
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all text-sm ${activeTab === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400 shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <LayoutDashboard size={20} /> 대시보드
            </button>
            <button 
              onClick={() => setActiveTab('insights')}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black transition-all text-sm ${activeTab === 'insights' ? 'bg-indigo-600/20 text-indigo-400 shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
            >
              <Database size={20} /> DB 보관함
            </button>
          </nav>
        </div>

        <div className="mt-auto p-8 space-y-4 border-t border-white/5">
          <button 
            onClick={() => setShowThemeModal(true)}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-slate-500 hover:text-indigo-400 hover:bg-white/10 transition-all text-sm group"
          >
            <Palette size={20} className="group-hover:rotate-12 transition-transform" /> 디자인 테마 설정
          </button>
          <button 
            onClick={handleOpenKeySelector}
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
                placeholder="트렌드 키워드나 분석하고 싶은 뉴스 주제를 입력하세요..." 
                className={`w-full ${themeStyle.card} rounded-3xl py-5 pl-16 pr-16 text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all placeholder:text-slate-600 font-bold text-xl shadow-2xl`}
                value={state.keyword}
                onChange={(e) => setState(prev => ({ ...prev, keyword: e.target.value }))}
              />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" size={26} />
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
