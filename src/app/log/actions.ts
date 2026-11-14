"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { requireFamily, requireUser } from "@/lib/auth";
import { historyHref, isDateString, todayKST } from "@/lib/date";
import { friendlyDbError } from "@/lib/errors";
import type { FormState } from "@/lib/form";
import { isReaction } from "@/lib/reactions";
import { createClient } from "@/lib/supabase/server";

/** 기록이 바뀌면 홈·달력·책장 모두 다시 그린다 */
function revalidateAll() {
  revalidatePath("/", "layout");
}

/** 직접 입력한 책: 내가 같은 제목·저자로 입력한 책이 이미 있으면 재사용 */
async function findOrCreateManualBook(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  authors: string[],
): Promise<{ id: string; error?: never } | { id?: never; error: PostgrestError }> {
  const { data: candidates, error: findError } = await supabase
    .from("books")
    .select("id, authors")
    .eq("source", "manual")
    .eq("created_by", userId) // 남이 입력한 책은 그 사람이 제목을 고칠 수 있어 재사용하지 않는다
    .eq("title", title)
    .limit(10);
  if (findError) return { error: findError };

  const key = authors.join("|");
  const existing = candidates?.find((b) => (b.authors as string[]).join("|") === key);
  if (existing) return { id: existing.id as string };

  const { data, error } = await supabase
    .from("books")
    .insert({ title, authors, source: "manual" })
    .select("id")
    .single();
  if (error) return { error };
  return { id: data.id as string };
}

/** 기록 + 아이 연결을 저장. 아이 연결이 실패하면 기록도 지운다 */
async function insertLog(
  supabase: SupabaseClient,
  log: {
    family_id: string;
    book_id: string;
    read_on: string;
    memo?: string | null;
    reaction?: string | null;
  },
  childIds: string[],
): Promise<PostgrestError | undefined> {
  const { data, error } = await supabase.from("reading_logs").insert(log).select("id").single();
  if (error) return error;

  const { error: linkError } = await supabase
    .from("reading_log_children")
    .insert(childIds.map((child_id) => ({ reading_log_id: data.id, child_id })));
  if (linkError) {
    await supabase.from("reading_logs").delete().eq("id", data.id);
    return linkError;
  }
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

export async function createLog(_prev: FormState, formData: FormData): Promise<FormState> {
  const bookId = String(formData.get("book_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const authorsText = String(formData.get("authors") ?? "").trim();
  const isNewBook = !bookId || bookId === "new";
  const details = parseDetails(formData);

  const fail = (error: string): FormState => ({
    error,
    values: { ...details.values, book_id: bookId, title, authors: authorsText },
  });

  if (isNewBook && (!title || title.length > 300)) return fail("책 제목을 입력해 주세요.");
  if (details.error) return fail(details.error);

  const { supabase, user, family } = await requireFamily();

  let finalBookId = bookId;
  if (isNewBook) {
    const authors = authorsText.split(",").map((a) => a.trim()).filter(Boolean);
    const book = await findOrCreateManualBook(supabase, user.id, title, authors);
    if (book.error) return fail(friendlyDbError("책을 저장하지 못했어요", book.error));
    finalBookId = book.id;
  }

  const error = await insertLog(
    supabase,
    {
      family_id: family.id,
      book_id: finalBookId,
      read_on: details.readOn,
      memo: details.memo,
      reaction: details.reaction,
    },
    details.childIds,
  );
  if (error) return fail(friendlyDbError("기록하지 못했어요", error));

  revalidateAll();
  redirect("/");
}

/** 기록 수정: 날짜·아이·반응·메모 (책은 바꾸지 않는다) */
export async function updateLog(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "");
  const details = parseDetails(formData);
  const fail = (error: string): FormState => ({ error, values: details.values });

  if (!id) return fail("수정할 기록을 찾을 수 없어요.");
  if (details.error) return fail(details.error);

  // 권한은 RLS 가 확인한다 (다른 가족의 기록은 조회되지 않는다)
  const { supabase } = await requireUser();

  const [{ data: log, error: logError }, { data: current, error: findError }] = await Promise.all([
    supabase.from("reading_logs").select("id").eq("id", id).maybeSingle(),
    supabase.from("reading_log_children").select("child_id").eq("reading_log_id", id),
  ]);
  const readError = logError ?? findError;
  if (readError) return fail(friendlyDbError("기록을 수정하지 못했어요", readError));
  if (!log) return fail("수정할 기록을 찾을 수 없어요.");

  // 순서: 아이 연결을 먼저 바꾸고(가장 실패하기 쉬운 단계), 성공했을 때만 날짜·반응·메모를 저장한다.
  // 아이는 새로 고른 아이를 먼저 추가하고 빠진 아이를 나중에 지운다 (중간에 실패해도 아이가 0명이 되지 않게)
  const before = new Set((current ?? []).map((c) => c.child_id as string));
  const added = details.childIds.filter((c) => !before.has(c));
  const removed = [...before].filter((c) => !details.childIds.includes(c));

  if (added.length > 0) {
    const { error: addError } = await supabase
      .from("reading_log_children")
      .insert(added.map((child_id) => ({ reading_log_id: id, child_id })));
    if (addError) return fail(friendlyDbError("읽어준 아이를 바꾸지 못했어요", addError));
  }
  if (removed.length > 0) {
    const { error: removeError } = await supabase
      .from("reading_log_children")
      .delete()
      .eq("reading_log_id", id)
      .in("child_id", removed);
    if (removeError) return fail(friendlyDbError("읽어준 아이를 바꾸지 못했어요", removeError));
  }

  const { error } = await supabase
    .from("reading_logs")
    .update({ read_on: details.readOn, memo: details.memo, reaction: details.reaction })
    .eq("id", id);
  if (error) return fail(friendlyDbError("기록을 수정하지 못했어요", error));

  revalidateAll();
  redirect(historyHref(details.readOn));
}

/** 홈의 "다시 읽기": 오늘 날짜로, 모든 아이에게, 내가 읽어준 것으로 바로 기록 */
export async function quickLog(formData: FormData) {
  const bookId = String(formData.get("book_id") ?? "");
  if (!bookId) return;
  const { supabase, family } = await requireFamily();
  await insertLog(
    supabase,
    { family_id: family.id, book_id: bookId, read_on: todayKST() },
    family.children.map((c) => c.id),
  );
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
