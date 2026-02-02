
import React from 'react';
import { FileText, X, Download, ShieldCheck, Cpu, Zap, Share2 } from 'lucide-react';
import { ProjectReport } from '../services/reportService';

interface ReportProps {
  reportData: ProjectReport;
  onClose: () => void;
}

const ProjectReportView: React.FC<ReportProps> = ({ reportData, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 no-print">
      <div className="bg-[#1e293b] text-slate-200 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2rem] border border-slate-700 shadow-[0_0_50px_-12px_rgba(99,102,241,0.3)] flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* 헤더 */}
        <header className="px-8 py-6 bg-indigo-600 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">AI 인텔리전스 분석 보고서</h2>
              <p className="text-xs text-indigo-100 font-medium">프로젝트 ID: TP-{Date.now().toString().slice(-6)}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-black/20 rounded-full transition-all active:scale-90"
          >
            <X size={24} />
          </button>
        </header>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar-report bg-[#0f172a] print-container">
          <div className="max-w-3xl mx-auto space-y-12">
            
            {/* 리포트 타이틀 섹션 */}
            <div className="text-center space-y-4 border-b border-slate-800 pb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest">
                <Zap size={12} /> 공식 분석 보고서
              </div>
              <h1 className="text-4xl font-black text-white leading-tight">
                {reportData.title}
              </h1>
              <div className="flex items-center justify-center gap-6 text-sm text-slate-500 font-medium">
                <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-500" /> Gemini 검증 완료</span>
                <span>•</span>
                <span>발행일: {reportData.date}</span>
              </div>
            </div>

            {/* 단계별 프로세스 */}
            <div className="space-y-10">
              {reportData.steps.map((item, idx) => (
                <section key={idx} className="relative pl-8 border-l-2 border-slate-800 group">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-[#0f172a] group-hover:bg-indigo-500 group-hover:border-indigo-500/30 transition-all duration-500"></div>
                  <h3 className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    {item.step}
                  </h3>
                  <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 text-slate-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {item.content}
                  </div>
                </section>
              ))}
            </div>

            {/* 기술 명세서 */}
            <section className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 p-8 rounded-[2rem] border border-indigo-500/20">
              <h3 className="text-white text-sm font-bold mb-6 flex items-center gap-2">
                <Cpu size={18} className="text-indigo-400" /> 핵심 기술 아키텍처 (기술 스택)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {reportData.techStack.map((tech, idx) => (
                  <div key={idx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-700 text-[10px] font-bold text-slate-400 text-center hover:text-white hover:border-indigo-500/50 transition-all">
                    {tech}
                  </div>
                ))}
              </div>
            </section>

            {/* 하단 푸터 */}
            <footer className="pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-[10px] font-black">TP</div>
                <span className="text-xs font-bold tracking-tighter">트렌드펄스 분석팀 (TrendPulse)</span>
              </div>
              <p className="text-[10px] font-medium">본 보고서는 AI에 의해 자동 생성되었으며 비즈니스 의사결정의 참고 자료로 활용될 수 있습니다.</p>
            </footer>
          </div>
        </div>

        {/* 하단 액션바 */}
        <div className="p-6 bg-[#1e293b] border-t border-slate-800 flex gap-4 no-print shrink-0">
          <button 
            onClick={() => window.print()} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Download size={20} /> 보고서 PDF / 인쇄물 저장
          </button>
          <button 
            className="px-8 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-4 rounded-2xl transition-all flex items-center gap-2 active:scale-[0.98]"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: reportData.title, text: reportData.steps[1].content, url: window.location.href });
              }
            }}
          >
            <Share2 size={20} /> 공유하기
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; color: black !important; }
          .print-container { background-color: white !important; color: black !important; overflow: visible !important; max-height: none !important; padding: 0 !important; }
          .bg-slate-900\/50, .bg-[#0f172a], .bg-[#1e293b] { background-color: #f8fafc !important; border-color: #e2e8f0 !important; }
          .text-white, .text-slate-200, .text-slate-300 { color: #0f172a !important; }
          .text-slate-500, .text-slate-400 { color: #64748b !important; }
          .border-slate-800, .border-slate-700 { border-color: #e2e8f0 !important; }
        }
        .custom-scrollbar-report::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-report::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-report::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default ProjectReportView;
