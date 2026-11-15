import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/date";
import type { Reaction } from "@/lib/reactions";

export type Book = { id: string; title: string; authors: string[]; cover_url: string | null };

/** 저장 전 책 정보 (id 없음) */
export type BookInfo = Omit<Book, "id">;

export type ReadingLog = {
  id: string;
  read_on: string;
  memo: string | null;
  reaction: Reaction | null;
  reader_user_id: string | null;
  book: Book;
  child_ids: string[];
};

/** 내보내기용: 출판사·ISBN 까지 */
type FullReadingLog = Omit<ReadingLog, "book"> & {
  book: Book & { isbn: string | null; publisher: string | null };
};

type Row<B = Book> = Omit<ReadingLog, "book" | "child_ids"> & {
  books: B;
  reading_log_children: { child_id: string }[];
};

const LOG_COLUMNS = "id, read_on, memo, reaction, reader_user_id, reading_log_children(child_id)";
const LOG_SELECT = `${LOG_COLUMNS}, books(id, title, authors, cover_url)`;
const FULL_LOG_SELECT = `${LOG_COLUMNS}, books(id, title, authors, cover_url, isbn, publisher)`;

function toLog<B>({ books, reading_log_children, ...log }: Row<B>) {
  return { ...log, book: books, child_ids: reading_log_children.map((c) => c.child_id) };
}

const PAGE = 1000; // Supabase 가 한 번에 돌려주는 최대 행 수

// 아래 조회는 모두 RLS 로 내 가족 기록만 돌려받는다

/** 최근 기록 (최신 날짜 → 최신 입력 순) */
export async function getRecentLogs(supabase: SupabaseClient, limit = 50): Promise<ReadingLog[]> {
  const { data, error } = await supabase
    .from("reading_logs")
    .select(LOG_SELECT)
    .order("read_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  if (error) throw error;
  return (data ?? []).map(toLog);
}

/** from ~ to (둘 다 포함) 사이의 기록 */
export async function getLogsBetween(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<ReadingLog[]> {
  const { data, error } = await supabase
    .from("reading_logs")
    .select(LOG_SELECT)
    .gte("read_on", from)
    .lte("read_on", to)
    .order("read_on")
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error) throw error;
  return (data ?? []).map(toLog);
}

/** 우리 가족 기록 전체 (오래된 날짜부터). 1000행씩 나눠 받는다 */
export async function getAllLogs(supabase: SupabaseClient): Promise<FullReadingLog[]> {
  const logs: FullReadingLog[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("reading_logs")
      .select(FULL_LOG_SELECT)
      .order("read_on")
      .order("created_at")
      .order("id") // 같은 시각이어도 페이지 경계에서 순서가 바뀌지 않게
      .range(from, from + PAGE - 1)
      .returns<Row<FullReadingLog["book"]>[]>();
    if (error) throw error;
    for (const row of data) logs.push(toLog(row));
    if (data.length < PAGE) return logs;
  }
}

export async function getLog(supabase: SupabaseClient, id: string): Promise<ReadingLog | null> {
  const { data, error } = await supabase
    .from("reading_logs")
    .select(LOG_SELECT)
    .eq("id", id)
    .returns<Row[]>()
    .maybeSingle();
  if (error) return null; // 잘못된 id 형식 등은 "없음" 으로 취급
  return data ? toLog(data) : null;
}

/** 최근에 읽은 책 (기록하기 화면의 선택지용, 책 정보만 가볍게 조회) */
export async function getRecentBooks(supabase: SupabaseClient, max: number): Promise<Book[]> {
  const { data, error } = await supabase
    .from("reading_logs")
    .select("books(id, title, authors, cover_url)")
    .order("read_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(max * 4)
    .returns<{ books: Book }[]>();
  if (error) throw error;
  return dedupeBooks((data ?? []).map((r) => r.books), max);
}

function dedupeBooks(books: Book[], max: number): Book[] {
  const seen = new Map<string, Book>();
  for (const book of books) {
    if (!seen.has(book.id)) seen.set(book.id, book);
    if (seen.size >= max) break;
  }
  return [...seen.values()];
}

/** 기록에서 책만 중복 없이 최근 순으로 */
export function recentBooks(logs: ReadingLog[], max: number): Book[] {
  return dedupeBooks(logs.map((log) => log.book), max);
}

type Stats = { total: number; thisMonth: number; streak: number };

/** 총 권수, 이번 달 권수, 연속 기록일 (오늘 또는 어제까지 이어진 날 수) */
export async function getStats(supabase: SupabaseClient, today: string): Promise<Stats> {
  const monthStart = `${today.slice(0, 7)}-01`;
  const [total, month, dates] = await Promise.all([
    supabase.from("reading_logs").select("id", { count: "exact", head: true }),
    supabase.from("reading_logs").select("id", { count: "exact", head: true }).gte("read_on", monthStart),
    // 연속 기록일 계산용: 최근 기록 날짜 (하루 여러 권이어도 400건이면 충분히 거슬러 올라간다)
    supabase.from("reading_logs").select("read_on").order("read_on", { ascending: false }).limit(400),
  ]);

  const readDays = new Set((dates.data ?? []).map((r) => r.read_on as string));
  let day = readDays.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (readDays.has(day)) {
    streak++;
    day = addDays(day, -1);
  }

  return { total: total.count ?? 0, thisMonth: month.count ?? 0, streak };
}

export type ShelfBook = Book & { count: number; lastRead: string };

/** 우리 집 책장: 읽은 책별 횟수와 마지막으로 읽은 날 (기록이 아주 많아지면 SQL group by 로 옮길 것) */
export async function getShelf(supabase: SupabaseClient): Promise<ShelfBook[]> {
  const { data, error } = await supabase
    .from("reading_logs")
    .select("read_on, books(id, title, authors, cover_url)")
    .order("read_on", { ascending: false })
    .limit(5000)
    .returns<{ read_on: string; books: Book }[]>();
  if (error) throw error;

  const shelf = new Map<string, ShelfBook>();
  for (const { read_on, books } of data ?? []) {
    const entry = shelf.get(books.id);
    if (entry) entry.count++;
    else shelf.set(books.id, { ...books, count: 1, lastRead: read_on });
  }
  return [...shelf.values()];
}

/** 나와 같은 가족 구성원의 호칭 (RLS 로 나 + 가족만 조회된다) */
export async function getFamilyNames(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data } = await supabase.from("profiles").select("id, display_name");
  return new Map((data ?? []).map((p) => [p.id as string, p.display_name as string]));
}
