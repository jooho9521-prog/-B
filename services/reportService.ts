
export interface ReportStep {
  step: string;
  content: string;
}

export interface ProjectReport {
  title: string;
  date: string;
  steps: ReportStep[];
  techStack: string[];
}

/**
 * 수집된 데이터와 분석 결과를 바탕으로 프로젝트 상세 보고서를 생성합니다.
 */
export const formatProjectReport = (
  originalSource: { domain: string; summary: string }, 
  aiSummary: string, 
  expandedContent: string
): ProjectReport => {
  const now = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return {
    title: "One Source Multi Use 기반 AI 콘텐츠 생성 프로젝트 보고서",
    date: now,
    steps: [
      { 
        step: "1단계: 데이터 수집 및 정제", 
        content: `검색 도메인: ${originalSource.domain}\n수집 데이터 요약: ${originalSource.summary}` 
      },
      { 
        step: "2단계: AI 심층 분석 및 인사이트 도출", 
        content: aiSummary 
      },
      { 
        step: "3단계: OSMU 기반 플랫폼별 콘텐츠 확장", 
        content: expandedContent 
      },
    ],
    techStack: [
      "Gemini 3 Flash Preview (분석 및 텍스트 생성)",
      "Gemini 2.5 Flash Image (시각 콘텐츠 생성)",
      "Google Search Grounding (실시간 데이터 검증)",
      "React/TypeScript & Tailwind CSS"
    ],
  };
};
