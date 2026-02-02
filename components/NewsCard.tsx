import React from 'react';
import { ExternalLink, Link2, Globe } from 'lucide-react';
import { NewsItem } from '../types';

interface NewsCardProps {
  item: NewsItem;
}

export const NewsCard: React.FC<NewsCardProps> = ({ item }) => {
  let domain = 'ai-trend.pulse';
  let faviconUrl = '';

  if (item.uri && item.uri !== '#') {
    try {
      const urlObj = new URL(item.uri);
      domain = urlObj.hostname;
      // Google Favicon service for higher reliability
      faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (e) {
      console.error("Invalid URI for favicon:", item.uri);
    }
  }

  const handleOpenSource = () => {
    if (item.uri && item.uri !== '#') {
      window.open(item.uri, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div 
      className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-6 transition-all duration-500 hover:bg-white/10 hover:border-indigo-500/30 group shadow-lg cursor-default"
    >
      <div className="flex gap-5">
        {/* 신뢰도 아이콘 / Favicon */}
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 overflow-hidden border border-white/10 shadow-inner group-hover:scale-105 transition-transform">
          {faviconUrl ? (
            <img 
              src={faviconUrl} 
              alt={item.source} 
              className="w-10 h-10 object-contain filter brightness-110"
              onError={(e) => {
                // If favicon fails, fallback to Globe icon
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="text-indigo-400 opacity-50"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/></svg></div>';
              }}
            />
          ) : (
             <div className="w-10 h-10 flex items-center justify-center text-slate-500">
               <Globe size={24} />
             </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          {/* 출처/언론사 정보 */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] truncate">
              {item.source || domain}
            </span>
          </div>
          
          {/* 기사 제목 (2줄 말줄임) */}
          <h4 className="text-[16px] font-bold text-white leading-tight line-clamp-2 tracking-tight mb-6 group-hover:text-indigo-300 transition-colors">
            {item.title}
          </h4>

          {/* 하단 액션 버튼 */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2 text-[10px] text-white/20 font-bold truncate max-w-[120px]">
              <Link2 size={12} className="opacity-50" />
              <span className="truncate">{domain}</span>
            </div>
            
            <button 
              onClick={handleOpenSource}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-xl shadow-indigo-600/20 active:scale-95 border border-white/5"
            >
              <span>기사 원문 보기</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};