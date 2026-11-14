/**
 * 서버 액션이 폼에 돌려주는 결과.
 * values: 에러 시 사용자가 입력한 값 — 폼이 자동 초기화돼도 defaultValue 로 다시 채운다 (비밀번호 제외)
 */
export type FormState =
  | { error?: string; message?: string; values?: Record<string, string> }
  | undefined;
