import { createContext, useContext } from 'react';

export type CodexLanguage = 'en' | 'ko';
export const CODEX_LANGUAGE_KEY = 'codex-pixel-agents.language';

const korean: Record<string, string> = {
  Characters: '캐릭터',
  Appearance: '외형',
  'Eight temple characters': '법당 캐릭터 8종',
  'Appearance previews, not live sessions. Each character has all 12 poses.':
    '외형 미리보기이며 실제 세션이 아니에요. 각 캐릭터는 12개 자세를 모두 갖고 있어요.',
  'Each session keeps its appearance when working, resting or reconnecting. Appearances may repeat across sessions.':
    '작업·휴식·재접속 때도 같은 세션은 같은 외형을 유지해요. 여러 세션이 같은 외형을 사용할 수 있어요.',
  'Close gallery': '캐릭터 창 닫기',
  'Preview pose': '미리보기 자세',
  'Standing prayer': '서서 합장',
  'Full bow': '엎드려 절하기',
  Scroll: '두루마리',
  Tea: '차 마시기',
  Reading: '독서',
  'Slate topknot': '청회 · 상투머리',
  'Jade braid': '청록 · 땋은 머리',
  'Ochre short hair': '황토 · 짧은 머리',
  'Rose low bun': '연분홍 · 쪽머리',
  'Sage shaved head': '회녹 · 삭발',
  'Indigo silver hair': '남색 · 은발',
  'Terracotta curls': '적갈 · 곱슬머리',
  'Ivory twin buns': '상아 · 두 갈래 머리',
  'Mountain Temple': '산속 절',
  'Lantern Hall': '연등 법당',
  All: '전체',
  'Rest & waiting': '대기·휴식',
  Leads: '총괄',
  'Activity filters': '활동 필터',
  'Agent details': '에이전트 상세',
  'Live · local sessions': '실시간 · 로컬 세션',
  'Waiting for session data…': '세션 정보 확인 중…',
  'Motion paused': '동작 일시정지',
  'Pause motion': '동작 정지',
  'Resume motion': '동작 재생',
  'Last recorded state': '마지막으로 기록된 상태',
  'The hall is quiet': '아직 법당에 도착한 에이전트가 없어요',
  'Temple artwork could not be loaded. Session data remains available in Sessions.':
    '법당 이미지를 불러오지 못했어요. 세션 목록에서 활동을 확인할 수 있어요.',
  'Select a character to inspect its activity. Use the zoom buttons and scroll to explore the hall.':
    '캐릭터를 선택하면 활동을 확인할 수 있어요. 확대·축소 버튼과 스크롤로 법당을 둘러보세요.',
  'Working agents bow toward the Buddha. Idle agents rest in the side lounges. Extra agents appear on additional pages; the full list stays available in Sessions.':
    '작업 중인 에이전트는 부처님을 향해 절하고, 대기 중에는 양쪽 공간에서 쉬어요. 인원이 많으면 다음 페이지에 표시하며 세션 목록에서 전체를 볼 수 있어요.',
  Session: '세션',
  Model: '모델',
  Project: '프로젝트',
  Tools: '도구',
  'Parent session': '부모 세션',
  Page: '페이지',
  'Previous page': '이전 페이지',
  'Next page': '다음 페이지',
  'Zoom in': '확대',
  'Zoom out': '축소',
  'Fit scene': '화면에 맞추기',
  'Viewer menu': '뷰어 메뉴',
  Sessions: '세션 목록',
  Help: '사용 안내',
  'Local session viewer · Read only': '로컬 세션 뷰어 · 읽기 전용',
  'Codex session monitor': 'Codex 세션 모니터',
  'Connecting to local monitor…': '로컬 모니터에 연결 중…',
  'Start a task in Codex Desktop or CLI. Recent local sessions will appear here.':
    'Codex 앱이나 CLI에서 작업을 시작하면 최근 로컬 세션이 여기에 표시돼요.',
  'Model not recorded': '모델 기록 없음',
  'Some transcripts exceed the 64 MiB replay limit.':
    '일부 세션 기록이 읽기 한도인 64 MiB를 초과했어요.',
  'Session scan failed.': '세션 기록을 읽지 못했어요.',
  'Some session files could not be read.': '일부 세션 파일을 읽지 못했어요.',
  'Activity inferred from local logs. No prompts or tool contents displayed. This viewer does not assign agents.':
    '로컬 기록으로 활동 상태를 표시해요. 대화 내용과 도구 입력·결과는 표시하지 않으며, 에이전트를 배정하지 않아요.',
  active: '작업 중',
  idle: '대기',
  interrupted: '중단됨',
  stale: '상태 확인 필요',
  unknown: '알 수 없음',
  'technical-director': '총괄 관리자',
  'code-implementer': '코드 구현',
  'code-reviewer': '코드 검토',
  'editor-engineer': '에디터 작업',
  'verification-engineer': '검증 담당',
  'qa-engineer': 'QA 담당',
  'gameplay-engineer': '게임플레이 개발',
  'build-engineer': '빌드 담당',
  'blueprint-engineer': '블루프린트 개발',
  'cpp-engineer': 'C++ 개발',
  'network-engineer': '네트워크 개발',
  'performance-engineer': '성능 최적화',
  'ui-engineer': 'UI 개발',
  Working: '작업 중',
  Idle: '대기',
  'Needs approval': '승인 필요',
  'Waiting for input': '입력 대기',
  Subtask: '하위 작업',
  LEAD: '관리자',
  'Close agent': '에이전트 닫기',
  'Connecting…': '연결 중…',
  'Reconnecting…': '다시 연결 중…',
  Disconnected: '연결 끊김',
  'Zoom in (Ctrl+Scroll)': '확대 (Ctrl+스크롤)',
  'Zoom out (Ctrl+Scroll)': '축소 (Ctrl+스크롤)',
  'Keep this viewer open and start a task in Codex. Recorded sessions and real subagents appear automatically.':
    '뷰어를 열어두고 Codex에서 작업을 요청하세요. 기록된 세션과 실제 하위 에이전트가 자동으로 나타나요.',
  'Select a character to inspect its activity. Use Ctrl+scroll to zoom, or pinch on touch screens.':
    '캐릭터를 선택하면 활동을 확인할 수 있어요. Ctrl+스크롤로 확대·축소하고, 터치 화면에서는 두 손가락을 사용하세요.',
  'Active: a turn or tool call was recorded. Idle: the turn ended; this does not prove success.':
    '작업 중: 턴 시작이나 도구 호출 기록이 있어요. 대기: 턴이 끝났다는 뜻이며, 작업 성공을 보장하지 않아요.',
  'Interrupted: the turn was aborted. Stale: no update for over 5 minutes. Unknown: no recognized activity yet.':
    '중단됨: 턴이 중단됐어요. 상태 확인 필요: 5분 넘게 새 기록이 없어요. 알 수 없음: 아직 활동 기록을 해석하지 못했어요.',
  'Language is saved in this browser. Model, tool and project names keep their original identifiers.':
    '선택한 언어는 이 브라우저에 저장돼요. 모델·도구·프로젝트 이름은 원래 식별자를 유지해요.',
};

export const CodexLocaleContext = createContext({
  language: 'en' as CodexLanguage,
  panelVisible: true,
});

export function readCodexLanguage(): CodexLanguage {
  try {
    return localStorage.getItem(CODEX_LANGUAGE_KEY) === 'ko' ? 'ko' : 'en';
  } catch {
    return 'en';
  }
}

export function useCodexLocale() {
  const context = useContext(CodexLocaleContext);
  const t = (text: string) => (context.language === 'ko' ? (korean[text] ?? text) : text);
  const activity = (text: string) => {
    if (context.language === 'ko' && text.startsWith('Running ')) return `${text.slice(8)} 실행 중`;
    return t(text);
  };
  // Translate only known role labels, preserving original model identifiers.
  const role = (text: string) => text.split(' · ').map(t).join(' · ');
  return { ...context, t, activity, role };
}
