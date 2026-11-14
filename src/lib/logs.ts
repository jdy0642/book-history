import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Reaction } from "@/lib/reactions";

export type Book = { id: string; title: string; authors: string[]; cover_url: string | null };

export type ReadingLog = {
  id: string;
  read_on: string;
  memo: string | null;
  reaction: Reaction | null;
  reader_user_id: string | null;
  book: Book;
  child_ids: string[];
};

type Row = Omit<ReadingLog, "book" | "child_ids"> & {
  books: Book;
  reading_log_children: { child_id: string }[];
};

/** 우리 가족의 최근 기록 (RLS 로 내 가족 기록만 조회된다) */
export async function getRecentLogs(supabase: SupabaseClient, limit = 50): Promise<ReadingLog[]> {
  const { data, error } = await supabase
    .from("reading_logs")
    .select(
      "id, read_on, memo, reaction, reader_user_id, books(id, title, authors, cover_url), reading_log_children(child_id)",
    )
    .order("read_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  if (error) throw error;
  return (data ?? []).map(({ books, reading_log_children, ...log }) => ({
    ...log,
    book: books,
    child_ids: reading_log_children.map((c) => c.child_id),
  }));
}

/** 기록에서 책만 중복 없이 최근 순으로 */
export function recentBooks(logs: ReadingLog[], max: number): Book[] {
  const seen = new Map<string, Book>();
  for (const log of logs) {
    if (!seen.has(log.book.id)) seen.set(log.book.id, log.book);
    if (seen.size >= max) break;
  }
  return [...seen.values()];
}

/** 나와 같은 가족 구성원의 호칭 (RLS 로 나 + 가족만 조회된다) */
export async function getFamilyNames(supabase: SupabaseClient): Promise<Map<string, string>> {
  const { data } = await supabase.from("profiles").select("id, display_name");
  return new Map((data ?? []).map((p) => [p.id as string, p.display_name as string]));
}
