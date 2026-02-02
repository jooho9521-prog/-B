import React, { useState, useEffect } from 'react';

// 아이콘 컴포넌트 (삭제/다운로드)
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const SavedCards = () => {
  const [savedCards, setSavedCards] = useState<any[]>([]);

  // 1. 초기 데이터 로드
  useEffect(() => {
    try {
      const data = localStorage.getItem('saved_cards');
      if (data) {
        setSavedCards(JSON.parse(data));
      }
    } catch (e) {
      console.error("데이터 로딩 실패", e);
    }
  }, []);

  // 2. 안전한 삭제 함수 (새로고침 없이 State만 갱신)
  const handleDelete = (e: React.MouseEvent, id: number | string) => {
    // 클릭 이벤트가 부모(카드 열기)로 퍼지는 것을 막음
    e.stopPropagation(); 
    e.preventDefault();

    try {
      // 1. 로컬 스토리지에서 삭제
      const currentCards = JSON.parse(localStorage.getItem('saved_cards') || "[]");
      const updatedCards = currentCards.filter((card: any) => String(card.id) !== String(id));
      localStorage.setItem('saved_cards', JSON.stringify(updatedCards));

      // 2. 화면 즉시 갱신
      setSavedCards(updatedCards);
    } catch (error) {
      console.error("삭제 중 오류 발생:", error);
    }
  };

  // 3. 이미지 다운로드 함수
  const handleDownload = (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `card_news_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (savedCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-white/5 rounded-[2.5rem]">
        <p className="font-bold text-xl">보관함이 비어있습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {savedCards.map((card) => (
        <div 
          key={card.id} 
          className="relative group bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-300 hover:border-indigo-500/30"
        >
          {/* 카드 이미지 영역 */}
          <div className="relative aspect-[9/16] w-full bg-slate-900">
            <img 
              src={card.imageUrl} 
              alt="Saved Card" 
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
            />
            
            {/* 호버 시 나타나는 액션 버튼들 */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
              <button
                onClick={(e) => handleDownload(e, card.imageUrl)}
                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl backdrop-blur-md transition-all active:scale-90"
                title="이미지 다운로드"
              >
                <DownloadIcon />
              </button>
              
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => handleDelete(e, card.id)}
                className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-xl backdrop-blur-md transition-all active:scale-90"
                title="삭제하기"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
          
          {/* 하단 정보 */}
          <div className="p-6 bg-slate-900/80 border-t border-white/5">
            <h4 className="text-white font-bold text-sm mb-2 line-clamp-1">{card.title || "제목 없음"}</h4>
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{card.date}</p>
              <p className="text-[10px] text-slate-600 font-mono">ID:{String(card.id).slice(-6)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SavedCards;