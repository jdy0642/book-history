// 날짜는 모두 'YYYY-MM-DD' / 'YYYY-MM' 문자열로 다룬다 (시간대 영향을 받지 않도록 UTC 자정 기준으로 계산)

const DAY_MS = 86_400_000;
export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 시각(Date 또는 ISO 문자열)을 한국 날짜 'YYYY-MM-DD' 로 (서버는 UTC 로 돌기 때문에 직접 계산) */
export function toDateKST(time: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(time));
}

/** 한국 시간 기준 오늘 날짜 'YYYY-MM-DD' */
export function todayKST(): string {
  return toDateKST(new Date());
}

function toTime(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromTime(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function isDateString(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromTime(toTime(value)) === value;
}

export function isMonthString(value: string | undefined): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addDays(date: string, days: number): string {
  return fromTime(toTime(date) + days * DAY_MS);
}

export function addMonths(month: string, months: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 7);
}

/** 그 달의 모든 날짜와, 1일의 요일(0=일요일) */
export function monthDays(month: string): { days: string[]; firstWeekday: number } {
  const first = `${month}-01`;
  const next = `${addMonths(month, 1)}-01`;
  const days: string[] = [];
  for (let d = first; d < next; d = addDays(d, 1)) days.push(d);
  return { days, firstWeekday: new Date(toTime(first)).getUTCDay() };
}

/** '2026-11-15' → '11월 15일 (일)' */
export function formatDateKo(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}월 ${d}일 (${WEEKDAYS[new Date(toTime(date)).getUTCDay()]})`;
}

/** 생년월 '2022-03' → '2022년 3월생' */
export function formatBirthMonth(month: string): string {
  return `${formatMonthKo(month)}생`;
}

/** '2026-11' → '2026년 11월' */
export function formatMonthKo(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}년 ${m}월`;
}

/** 달력에서 그 날짜를 선택한 화면 주소 */
export function historyHref(date: string): string {
  return `/history?month=${date.slice(0, 7)}&date=${date}`;
}
