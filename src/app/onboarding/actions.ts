"use server";

import { revalidatePath } from "next/cache";
import { getMyFamily, requireUser } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import type { FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

export async function createFamily(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const fail = (error: string): FormState => ({ error, values: { name } });
  if (!name || name.length > 30) return fail("가족 이름을 1~30자로 입력해 주세요.");

  const { supabase } = await requireUser();
  if (await getMyFamily(supabase)) return fail("이미 가족이 있어요.");

  const { error } = await supabase.rpc("create_family", { family_name: name });
  if (error) return fail(friendlyDbError("가족을 만들지 못했어요", error));

  revalidatePath("/", "layout");
  return undefined;
}

export async function addChild(_prev: FormState, formData: FormData): Promise<FormState> {
  const nickname = String(formData.get("nickname") ?? "").trim();
  const birthMonth = String(formData.get("birth_month") ?? "").trim() || null;
  const fail = (error: string): FormState => ({
    error,
    values: { nickname, birth_month: birthMonth ?? "" },
  });

  if (!nickname || nickname.length > 20) return fail("아이 이름(별명)을 1~20자로 입력해 주세요.");
  if (birthMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(birthMonth)) {
    return fail("생년월 형식이 올바르지 않아요.");
  }

  // 첫 아이 등록도 여기서 하므로 requireFamily(아이 1명 이상 필요) 대신 직접 확인
  const { supabase } = await requireUser();
  const family = await getMyFamily(supabase);
  if (!family) return fail("가족을 먼저 만들어 주세요.");

  const { error } = await supabase
    .from("children")
    .insert({ family_id: family.id, nickname, birth_month: birthMonth });
  if (error) return fail(friendlyDbError("아이를 등록하지 못했어요", error));

  revalidatePath("/", "layout");
  return undefined;
}

export async function deleteChild(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // 로그인 여부·권한은 RLS 가 확인한다 (우리 가족 아이만 지워진다)
  const supabase = await createClient();
  await supabase.from("children").delete().eq("id", id);
  revalidatePath("/", "layout");
}
