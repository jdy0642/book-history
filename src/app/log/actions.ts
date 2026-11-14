"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { requireFamily } from "@/lib/auth";
import { todayKST } from "@/lib/date";
import { friendlyDbError } from "@/lib/errors";
import { isReaction } from "@/lib/reactions";
import type { FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

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

export async function createLog(_prev: FormState, formData: FormData): Promise<FormState> {
  const bookId = String(formData.get("book_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const authorsText = String(formData.get("authors") ?? "").trim();
  const readOn = String(formData.get("read_on") ?? "");
  const childIds = formData.getAll("child_ids").map(String);
  const reaction = String(formData.get("reaction") ?? "");
  const memo = String(formData.get("memo") ?? "").trim();
  const isNewBook = !bookId || bookId === "new";

  const fail = (error: string): FormState => ({
    error,
    values: { book_id: bookId, title, authors: authorsText, read_on: readOn, reaction, memo, child_ids: childIds.join(",") },
  });

  if (isNewBook && (!title || title.length > 300)) return fail("책 제목을 입력해 주세요.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(readOn) || readOn > todayKST()) {
    return fail("읽은 날짜를 확인해 주세요. (미래 날짜는 안 돼요)");
  }
  if (childIds.length === 0) return fail("읽어준 아이를 한 명 이상 골라 주세요.");
  if (reaction && !isReaction(reaction)) return fail("아이 반응 값이 올바르지 않아요.");
  if (memo.length > 500) return fail("메모는 500자까지 쓸 수 있어요.");

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
      read_on: readOn,
      memo: memo || null,
      reaction: reaction || null,
    },
    childIds,
  );
  if (error) return fail(friendlyDbError("기록하지 못했어요", error));

  revalidatePath("/");
  redirect("/");
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
  revalidatePath("/");
}

export async function deleteLog(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // 권한은 RLS 가 확인한다 (우리 가족 기록만 지워진다). 아이 연결은 cascade 로 함께 삭제
  const supabase = await createClient();
  await supabase.from("reading_logs").delete().eq("id", id);
  revalidatePath("/");
}
