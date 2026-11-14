"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { requireFamily, requireUser } from "@/lib/auth";
import { historyHref, isDateString, todayKST } from "@/lib/date";
import { friendlyDbError } from "@/lib/errors";
import type { FormState } from "@/lib/form";
import { searchKakaoBooks, type KakaoBook, type PickedBook } from "@/lib/kakao";
import { isReaction } from "@/lib/reactions";
import { createClient } from "@/lib/supabase/server";

type BookResult = { id: string; error?: never } | { id?: never; error: string };

const saveBookFail = (error: PostgrestError): BookResult => ({
  error: friendlyDbError("책을 저장하지 못했어요", error),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 기록이 바뀌면 홈·달력·책장 모두 다시 그린다 */
function revalidateAll() {
  revalidatePath("/", "layout");
}

/** 조건에 맞는 책이 이미 있으면 그 id, 없으면 새로 저장 (직접 입력 책 / ISBN 을 믿을 수 없는 카카오 책) */
async function findOrInsertBook(
  supabase: SupabaseClient,
  match: Record<string, string | null>,
  row: Record<string, unknown>,
  isSame: (found: Record<string, unknown>) => boolean = () => true,
): Promise<BookResult> {
  let query = supabase.from("books").select("id, authors");
  for (const [column, value] of Object.entries(match)) {
    query = value === null ? query.is(column, null) : query.eq(column, value);
  }
  const { data: candidates, error: findError } = await query.limit(10);
  if (findError) return saveBookFail(findError);

  const existing = candidates?.find(isSame);
  if (existing) return { id: existing.id as string };

  const { data, error } = await supabase.from("books").insert(row).select("id").single();
  if (error) return saveBookFail(error);
  return { id: data.id as string };
}

/**
 * 카카오에서 고른 책을 ISBN 으로 카카오에 다시 조회한다.
 * 브라우저가 보낸 값은 믿지 않는다 (책 정보는 모든 가족이 같이 쓰므로, 조작된 값이 들어가지 않게).
 * 일부 출판사는 임시 ISBN(예: 1234567890123)을 여러 책에 같이 쓰므로
 * 고른 제목과 같은 책을 찾고, 그 ISBN 에 서로 다른 책이 여러 권인지(ambiguous)도 알려준다.
 */
async function lookupKakaoBook(
  picked: Pick<PickedBook, "isbn" | "title">,
): Promise<{ book: KakaoBook; ambiguous: boolean } | { error: string }> {
  if (!/^\d{10}(\d{3})?$/.test(picked.isbn)) return { error: "고른 책의 정보가 올바르지 않아요." };
  let matches;
  try {
    matches = (await searchKakaoBooks(picked.isbn, { target: "isbn", size: 50 })).filter(
      (b) => b.isbn === picked.isbn,
    );
  } catch {
    return { error: "책 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  const book = matches.find((b) => b.title === picked.title);
  if (!book) return { error: "고른 책을 카카오에서 찾을 수 없어요. 다시 검색해 주세요." };
  return { book, ambiguous: new Set(matches.map((b) => `${b.title}|${b.publisher}`)).size > 1 };
}

/** 카카오 책 저장: ISBN 을 믿을 수 있으면 ISBN 으로, 아니면 ISBN 없이 "제목 + 출판사"로 재사용·저장 */
async function saveKakaoBook(
  supabase: SupabaseClient,
  { book, ambiguous }: { book: KakaoBook; ambiguous: boolean },
): Promise<BookResult> {
  if (ambiguous) {
    return findOrInsertBook(
      supabase,
      { source: "kakao", isbn: null, title: book.title, publisher: book.publisher },
      { title: book.title, authors: book.authors, publisher: book.publisher, cover_url: book.cover_url, source: "kakao" },
    );
  }
  const { data, error } = await supabase.rpc("upsert_kakao_book", {
    p_isbn: book.isbn,
    p_title: book.title,
    p_authors: book.authors,
    p_publisher: book.publisher,
    p_cover_url: book.cover_url,
  });
  if (error) return saveBookFail(error);
  return { id: data as string };
}

/** 기록 + 읽어준 아이를 한 번에 저장 (DB 함수가 한 트랜잭션으로 처리) */
async function insertLog(
  supabase: SupabaseClient,
  familyId: string,
  bookId: string,
  childIds: string[],
  details: { readOn: string; memo?: string | null; reaction?: string | null },
): Promise<PostgrestError | null> {
  const { error } = await supabase.rpc("create_reading_log", {
    p_family_id: familyId,
    p_book_id: bookId,
    p_read_on: details.readOn,
    p_child_ids: childIds,
    p_memo: details.memo ?? null,
    p_reaction: details.reaction ?? null,
  });
  return error;
}

/** 기록 추가·수정 폼의 공통 항목 (날짜·아이·반응·메모) 검사 */
function parseDetails(formData: FormData) {
  const readOn = String(formData.get("read_on") ?? "");
  const childIds = formData.getAll("child_ids").map(String);
  const reaction = String(formData.get("reaction") ?? "");
  const memo = String(formData.get("memo") ?? "").trim();
  const values = { read_on: readOn, reaction, memo, child_ids: childIds.join(",") };

  let error: string | undefined;
  if (!isDateString(readOn) || readOn > todayKST()) error = "읽은 날짜를 확인해 주세요. (미래 날짜는 안 돼요)";
  else if (childIds.length === 0) error = "읽어준 아이를 한 명 이상 골라 주세요.";
  else if (reaction && !isReaction(reaction)) error = "아이 반응 값이 올바르지 않아요.";
  else if (memo.length > 500) error = "메모는 500자까지 쓸 수 있어요.";

  return { readOn, childIds, reaction: reaction || null, memo: memo || null, values, error };
}

function parsePickedBook(raw: string): PickedBook | null {
  try {
    const book = JSON.parse(raw) as PickedBook;
    return typeof book?.isbn === "string" && typeof book.title === "string" ? book : null;
  } catch {
    return null;
  }
}

export async function createLog(_prev: FormState, formData: FormData): Promise<FormState> {
  // book_id: 최근 책의 id | "new"(직접 입력) | "kakao"(검색해서 고른 책, kakao_book 에 JSON)
  const bookId = String(formData.get("book_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const authorsText = String(formData.get("authors") ?? "").trim();
  const kakaoBook = String(formData.get("kakao_book") ?? "");
  const details = parseDetails(formData);

  // 에러 시 고른 책(검색 결과 포함)과 입력값을 그대로 돌려준다
  const fail = (error: string): FormState => ({
    error,
    values: { ...details.values, book_id: bookId, title, authors: authorsText, kakao_book: kakaoBook },
  });

  const isNewBook = !bookId || bookId === "new";
  const picked = bookId === "kakao" ? parsePickedBook(kakaoBook) : null;
  if (isNewBook && (!title || title.length > 300)) return fail("책 제목을 입력해 주세요.");
  if (bookId === "kakao" && !picked) return fail("검색한 책을 골라 주세요.");
  if (details.error) return fail(details.error);

  // 카카오 조회는 로그인·가족 확인과 상관없으니 동시에
  const [{ supabase, user, family }, kakao] = await Promise.all([
    requireFamily(),
    picked ? lookupKakaoBook(picked) : null,
  ]);

  let book: BookResult;
  if (isNewBook) {
    const authors = authorsText.split(",").map((a) => a.trim()).filter(Boolean);
    // 내가 같은 제목·저자로 입력한 책이 있으면 재사용 (남이 입력한 책은 그 사람이 제목을 고칠 수 있어 제외)
    book = await findOrInsertBook(
      supabase,
      { source: "manual", created_by: user.id, title },
      { title, authors, source: "manual" },
      (found) => (found.authors as string[]).join("|") === authors.join("|"),
    );
  } else if (kakao) {
    book = "error" in kakao ? { error: kakao.error } : await saveKakaoBook(supabase, kakao);
  } else {
    book = { id: bookId }; // 최근 책 (RLS 와 FK 가 유효성을 확인한다)
  }
  if (book.id === undefined) return fail(book.error);

  const error = await insertLog(supabase, family.id, book.id, details.childIds, details);
  if (error) return fail(friendlyDbError("기록하지 못했어요", error));

  revalidateAll();
  redirect("/");
}

/** 기록 수정: 날짜·아이·반응·메모 (책은 바꾸지 않는다). DB 함수가 한 트랜잭션으로 처리 */
export async function updateLog(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const details = parseDetails(formData);
  const fail = (error: string): FormState => ({ error, values: details.values });

  if (!UUID.test(id)) return fail("수정할 기록을 찾을 수 없어요.");
  if (details.error) return fail(details.error);

  // 권한은 RLS 가 확인한다 (다른 가족의 기록은 "없음"으로 처리된다)
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("update_reading_log", {
    p_id: id,
    p_read_on: details.readOn,
    p_child_ids: details.childIds,
    p_memo: details.memo,
    p_reaction: details.reaction,
  });
  if (error?.code === "P0002") return fail("수정할 기록을 찾을 수 없어요."); // 없는 기록이거나 다른 가족의 기록
  if (error) return fail(friendlyDbError("기록을 수정하지 못했어요", error));

  revalidateAll();
  redirect(historyHref(details.readOn));
}

/** 홈의 "다시 읽기": 오늘 날짜로, 모든 아이에게, 내가 읽어준 것으로 바로 기록 */
export async function quickLog(formData: FormData) {
  const bookId = String(formData.get("book_id") ?? "");
  if (!bookId) return;
  const { supabase, family } = await requireFamily();
  await insertLog(supabase, family.id, bookId, family.children.map((c) => c.id), { readOn: todayKST() });
  revalidateAll();
}

/** 기록 삭제. 폼에 next 가 있으면 삭제 후 그 화면으로 이동 (예: 수정 화면에서 지운 경우 달력으로) */
export async function deleteLog(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!id) return;
  // 권한은 RLS 가 확인한다 (우리 가족 기록만 지워진다). 아이 연결은 cascade 로 함께 삭제
  const supabase = await createClient();
  await supabase.from("reading_logs").delete().eq("id", id);
  revalidateAll();
  // 앱 내부 경로만 허용 (외부 사이트로 보내지 않도록)
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
}
