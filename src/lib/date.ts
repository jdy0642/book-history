/** 한국 시간 기준 오늘 날짜 'YYYY-MM-DD' (서버는 UTC 로 돌기 때문에 직접 계산) */
export function todayKST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}
