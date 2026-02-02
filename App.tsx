
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
  Save,
  Target,
  BarChart3,
  TrendingUp,
  Activity
} from 'lucide-react';
import { GeminiTrendService } from './services/geminiService';
import { AppState, NewsItem } from './types';
import { NewsCard } from './components/NewsCard';
import ContentExpander from './components/ContentExpander';
import SavedCards from './components/SavedCards';
import ChatWidget from './ChatWidget';

type ThemeType = 'aurora' | 'midnight' | 'obsidian';

// 분석 모드 옵션 정의
const ANALYSIS_MODES = [
  { id: 'general', name: '📋 일반 종합 분석', prompt: '종합적인 관점에서 사실 위주로 핵심 트렌드를 정리하세요.' },
  { id: 'swot', name: '🛡️ SWOT 전략 분석', prompt: '강점(Strength), 약점(Weakness), 기회(Opportunity), 위협(Threat) 프레임워크를 기반으로 전략적 분석을 수행하세요.' },
  { id: 'market', name: '📈 시장 전망 분석', prompt: '향후 시장 규모, 주요 플레이어의 경쟁 동향, 경제적 파급효과 및 성패 요인 위주로 분석하세요.' },
  { id: 'fact', name: '✅ 팩트체크 위주', prompt: '데이터의 진위 여부, 통계의 정확성 및 정보 출처의 신뢰성 검증 위주로 팩트체크를 수행하세요.' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights'>('dashboard');
  const [theme, setTheme] = useState<ThemeType>('aurora');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  
  const [selectedMode, setSelectedMode] = useState(ANALYSIS_MODES[0]);
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

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey && typeof window !== 'undefined') {
      const win = window as any;
      win.process = win.process || { env: {} };
      win.process.env = win.process.env || {};
      win.process.env.API_KEY = savedKey;
    }
  }, []);

  const handleSaveApiKey = () => {
    const trimmedKey = tempApiKey.trim();
    if (!trimmedKey) {
      showToast("API 키를 입력해주세요.");
      return;
    }
    localStorage.setItem('gemini_api_key', trimmedKey);
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.process = win.process || { env: {} };
      win.process.env = win.process.env || {};
      win.process.env.API_KEY = trimmedKey;
    }
    showToast("API 키가 저장되었습니다.");
    setIsKeyModalOpen(false);
    setState(prev => ({ ...prev, error: null }));
  };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!state.keyword.trim() || state.isLoading) return;

    const apiKey = localStorage.getItem('gemini_api_key') || (window as any).process?.env?.API_KEY;
    if (!apiKey) {
      setIsKeyModalOpen(true);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, results: [], analysis: null }));
    setNewsSources([]); 
    setExpandedContent({ image: null, video: null, sns: null }); 
    setActiveTab('dashboard');
    
    try {
      const service = new GeminiTrendService();
      const { news, analysis } = await service.fetchTrendsAndAnalysis(state.keyword, selectedMode.prompt);
      setState(prev => ({ ...prev, results: news, analysis, isLoading: false }));
      setNewsSources(news);
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
      showToast("분석 중 오류가 발생했습니다.");
    }
  }, [state.keyword, state.isLoading, selectedMode]);

  const getThemeStyles = () => {
    switch(theme) {
      case 'aurora':
        return {
          background: 'radial-gradient(circle at 10% 20%, rgb(20, 20, 60) 0%, rgb(10, 10, 20) 90%)',
          card: 'bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl',
          sidebar: 'bg-black/60 border-r border-white/5',
          accent: 'text-indigo-400'
        };
      case 'midnight':
        return {
          background: 'linear-gradient(to bottom right, #020617, #0f172a)',
          card: 'bg-slate-900/60 border border-slate-800 shadow-xl',
          sidebar: 'bg-slate-950 border-r border-slate-800',
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

    let processed = text.replace(/\\n/g, '\n');

    // 1. [기존] URL 및 참조 문구 삭제
    processed = processed.replace(/\(참조:[\s\S]*?\)/gi, '');
    processed = processed.replace(/(참조|출처|Source):\s*https?:\/\/[^\s\n]+/gi, '');
    processed = processed.replace(/https?:\/\/[^\s\)]+/g, '');
    
    // 2. [신규] 빈 괄호 및 잔여 특수문자 청소 (여기가 핵심입니다!)
    processed = processed
      .replace(/\(\s*\)/g, '')       // 내용이 없는 빈 괄호 '( )' 삭제
      .replace(/\(\s*$/g, '')        // 문장 끝에 홀로 남은 여는 괄호 '(' 삭제
      .replace(/^\s*[\)\].]+\s*/, '') // 혹시 문장 앞에 남은 닫는 괄호 삭제
      .replace(/\s{2,}/g, ' ');      // 다 지우고 남은 두 칸 이상의 공백을 한 칸으로

    // 3. [기존] 번호 서식 정리
    processed = processed.replace(/([.!?])\s*(\d+\.)/g, '$1\n\n$2');
    processed = processed.replace(/\*\*/g, '').replace(/\[.*?\]/g, '').trim();

    return processed.split('\n')
      .map(line => line.trim())
      .filter(line => /^\d+\.\s/.test(line) && line.length > 10);
  };

  const handleDiscussWithAI = () => {
    if (!state.analysis) return;
    setChatCommand({
      text: `"${state.keyword}"에 대해 선택한 [${selectedMode.name}] 관점으로 분석 결과를 더 자세히 설명해줘.`,
      time: Date.now()
    });
  };

  const themeStyle = getThemeStyles();

  return (
    <div className="flex h-screen text-white overflow-hidden relative" style={{ background: themeStyle.background }}>
      <aside className={`w-72 flex flex-col z-30 ${themeStyle.sidebar}`}>
        <div className="p-8">
          <div className="flex items-center gap-4 mb-14">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl flex items-center justify-center font-black text-white shadow-2xl">TP</div>
            <div>
              <span className="text-2xl font-black tracking-tighter block">TrendPulse</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 block">Intelligent OS Hub</span>
            </div>
          </div>
          <nav className="space-y-3">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400 shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              <LayoutDashboard size={20} /> 대시보드
            </button>
            <button onClick={() => setActiveTab('insights')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${activeTab === 'insights' ? 'bg-indigo-600/20 text-indigo-400 shadow-inner' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
              <Database size={20} /> DB 보관함
            </button>
          </nav>
        </div>
        <div className="mt-auto p-8 space-y-4 border-t border-white/5">
          <button onClick={() => setShowThemeModal(true)} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-slate-500 hover:text-indigo-400 hover:bg-white/10 transition-all text-sm"><Palette size={20} /> 테마 설정</button>
          <button onClick={() => setIsKeyModalOpen(true)} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-slate-500 hover:text-amber-400 hover:bg-white/10 transition-all text-sm"><Key size={20} /> API 키 관리</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <header className="sticky top-0 z-40 bg-transparent px-12 py-10">
          <div className="max-w-6xl mx-auto space-y-6">
            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute left-8 top-1/2 -translate-y-1/2 z-10">
                <button type="submit" className="text-slate-500 hover:text-indigo-400 transition-colors p-2" disabled={state.isLoading}>
                  <Search size={30} />
                </button>
              </div>
              <input 
                type="text" 
                placeholder="어떤 트렌드를 분석할까요?" 
                className={`w-full ${themeStyle.card} rounded-[2.5rem] py-6 pl-24 pr-16 text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all font-bold text-2xl shadow-2xl relative`}
                value={state.keyword}
                onChange={(e) => setState(prev => ({ ...prev, keyword: e.target.value }))}
                disabled={state.isLoading}
              />
              {state.isLoading && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10">
                  <Loader2 className="animate-spin text-indigo-500" size={30} />
                </div>
              )}
            </form>

            <div className="flex flex-wrap gap-2 items-center px-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mr-2">Framework:</span>
              {ANALYSIS_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode)}
                  className={`px-4 py-2 text-[11px] font-black rounded-xl border transition-all flex items-center gap-2 ${
                    selectedMode.id === mode.id
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20'
                      : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                  }`}
                >
                  {mode.name}
                  {selectedMode.id === mode.id && <CheckCircle2 size={12} />}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="px-12 pb-24 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-12 gap-12">
            <section className="col-span-12 xl:col-span-8 space-y-12">
              {activeTab === 'dashboard' ? (
                <>
                  {state.analysis ? (
                    <div className={`${themeStyle.card} rounded-[3.5rem] p-12 space-y-14 animate-in fade-in slide-in-from-bottom-12 duration-700`}>
                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="space-y-2">
                          <h2 className="text-3xl font-black text-indigo-400 flex items-center gap-4 uppercase tracking-tighter">
                            <BrainCircuit size={40} /> AI Intelligence Report
                          </h2>
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-indigo-500/10 rounded-lg text-[10px] font-black text-indigo-400 border border-indigo-500/20">{selectedMode.name}</span>
                            <span className="text-[10px] font-bold text-slate-600">Generated by Gemini 3 Flash</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Impact Score</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-2xl font-black ${state.analysis.growthScore > 70 ? 'text-emerald-400' : 'text-indigo-400'}`}>{state.analysis.growthScore}%</span>
                              <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500" style={{ width: `${state.analysis.growthScore}%` }}></div>
                              </div>
                            </div>
                          </div>
                          <button onClick={handleDiscussWithAI} className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs transition-all shadow-xl shadow-indigo-600/20 flex items-center gap-2 active:scale-95">
                            <MessageSquare size={16} /> AI 심층 토론
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {state.analysis.keyPoints.map((point, idx) => (
                          <div key={idx} className="p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col gap-3">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                              {idx === 0 ? <TrendingUp size={20} /> : idx === 1 ? <Target size={20} /> : <Activity size={20} />}
                            </div>
                            <p className="text-sm font-bold text-white/80 leading-relaxed">{point}</p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-8">
                        {parseInsights(state.analysis.summary).map((line, i) => (
                          <p key={i} className="text-2xl font-medium leading-[1.8] text-white/90 bg-white/5 p-10 rounded-3xl border border-white/5 hover:border-white/10 transition-all shadow-inner">
                            {line}
                          </p>
                        ))}
                      </div>

                      <ContentExpander 
                        summary={state.analysis.summary} 
                        expandedData={expandedContent}
                        setExpandedData={setExpandedContent}
                        onShowToast={showToast}
                      />
                    </div>
                  ) : (
                    !state.isLoading && (
                      <div className="py-48 text-center flex flex-col items-center">
                        <Sparkles size={80} className="text-indigo-500/30 mb-8 animate-pulse" />
                        <h1 className="text-7xl font-black tracking-tighter mb-6">Explore Trends</h1>
                        <p className="text-slate-500 text-xl font-bold max-w-xl mx-auto">프레임워크를 선택하고 키워드를 입력하여<br/>나만의 커스텀 AI 리포트를 생성하세요.</p>
                      </div>
                    )
                  )}
                </>
              ) : (
                <div className="space-y-10 animate-in fade-in duration-500">
                  <h2 className="text-5xl font-black tracking-tighter flex items-center gap-4"><Database className="text-indigo-500" size={48} /> DB 보관함</h2>
                  <SavedCards />
                </div>
              )}
            </section>

            <aside className="col-span-12 xl:col-span-4 space-y-12">
              <div className={`${themeStyle.card} rounded-[3rem] p-10 shadow-2xl sticky top-40`}>
                <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black flex items-center gap-4"><Globe className="text-indigo-400" size={32} /> 소스 피드</h3>
                  {newsSources.length > 0 && <span className="text-[10px] font-black text-slate-500 px-3 py-1 bg-white/10 rounded-full">{newsSources.length} SOURCES</span>}
                </div>
                <div className="space-y-6 max-h-[800px] overflow-y-auto custom-scrollbar pr-2">
                  {newsSources.length > 0 ? newsSources.map((item, idx) => (
                    <NewsCard key={idx} item={item} />
                  )) : state.isLoading ? (
                    <div className="py-24 text-center opacity-50"><Loader2 className="animate-spin mx-auto mb-4" /> 리서치 중...</div>
                  ) : (
                    <div className="py-24 text-center opacity-30 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                      <Search size={40} className="mx-auto mb-4" />
                      <p className="text-sm font-bold">분석 대기 중</p>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-6">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-12 w-full max-w-xl relative">
            <button onClick={() => setIsKeyModalOpen(false)} className="absolute right-10 top-10 text-slate-500 hover:text-white"><X size={32} /></button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6"><Key size={36} className="text-amber-500" /></div>
              <h2 className="text-3xl font-black mb-3">API 키 관리</h2>
              <p className="text-slate-400 text-sm">서비스 이용을 위해 Gemini API 키가 필요합니다.</p>
            </div>
            <div className="space-y-6">
              <input 
                type="password" 
                placeholder="API 키를 입력하세요..." 
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white font-mono text-sm focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
              />
              <button onClick={handleSaveApiKey} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all"><Save size={18} /> 저장 및 적용</button>
            </div>
          </div>
        </div>
      )}

      {showThemeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6">
          <div className="bg-[#1e293b] border border-white/10 rounded-[3rem] p-12 w-full max-w-3xl relative">
            <button onClick={() => setShowThemeModal(false)} className="absolute right-10 top-10 text-slate-500 hover:text-white"><X size={32} /></button>
            <h2 className="text-4xl font-black mb-12 flex items-center gap-5 tracking-tighter"><Palette className="text-indigo-400" size={44} /> 테마 설정</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {['aurora', 'midnight', 'obsidian'].map(t => (
                <button key={t} onClick={() => { setTheme(t as ThemeType); setShowThemeModal(false); }} className={`p-8 rounded-[2.5rem] border-2 text-left transition-all ${theme === t ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}>
                  <div className={`w-16 h-16 rounded-2xl mb-8 ${t === 'aurora' ? 'bg-gradient-to-br from-indigo-600 to-cyan-500' : t === 'midnight' ? 'bg-slate-800' : 'bg-black'}`} />
                  <span className="text-xl font-black capitalize text-white">{t}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 bg-indigo-600 text-white rounded-full font-black shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          {toast.message}
        </div>
      )}

      <ChatWidget analysis={state.analysis} externalCommand={chatCommand} keyword={state.keyword} />
    </div>
  );
};

export default App;
