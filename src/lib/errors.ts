import "server-only";

type DbError = { code?: string; message: string };

/**
 * DB(Postgres/PostgREST) 에러를 사용자용 문장으로 바꾼다.
 * 원문(테이블·정책 이름 등)은 화면에 내보내지 않고 서버 로그에만 남긴다.
 */
export function friendlyDbError(prefix: string, error: DbError): string {
  console.error(`[db] ${prefix}:`, error.code, error.message);
  return `${prefix}. ${reason(error.code)}`;
}

function reason(code?: string): string {
  switch (code) {
    case "42501": // RLS 정책 위반
      return "권한이 없는 요청이에요.";
    case "23503": // 참조하는 행이 없음 (지워진 책·아이 등)
      return "선택한 항목을 찾을 수 없어요. 새로고침 후 다시 시도해 주세요.";
    case "23502": // NOT NULL
    case "23514": // CHECK 제약
    case "22P02": // 잘못된 형식 (uuid 등)
      return "입력한 내용을 다시 확인해 주세요.";
    default:
      return "잠시 후 다시 시도해 주세요.";
  }
}
