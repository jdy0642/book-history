"use server";

import { revalidatePath } from "next/cache";
import { requireFamily, requireUser } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import type { FormState } from "@/lib/form";
import { DISPLAY_NAME_ERROR, isValidDisplayName, updateDisplayName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

/** 초대 링크 만들기 (7일 동안 유효, 토큰은 DB 가 만든다) */
export async function createInvite(): Promise<FormState> {
  const { supabase, family } = await requireFamily();
  const { error } = await supabase.from("family_invites").insert({ family_id: family.id });
  if (error) return { error: friendlyDbError("초대 링크를 만들지 못했어요", error) };
  revalidatePath("/family");
  return undefined;
}

export async function deleteInvite(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // 권한은 RLS 가 확인한다 (우리 가족의 초대만 지워진다)
  const supabase = await createClient();
  await supabase.from("family_invites").delete().eq("id", id);
  revalidatePath("/family");
}

/** 내 호칭 바꾸기 (카카오로 가입하면 처음엔 카카오 닉네임이 들어간다) */
export async function changeDisplayName(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("display_name") ?? "").trim();
  const fail = (error: string): FormState => ({ error, values: { display_name: name } });
  if (!isValidDisplayName(name)) return fail(DISPLAY_NAME_ERROR);

  const { supabase, user } = await requireUser();
  const { error } = await updateDisplayName(supabase, user.id, name);
  if (error) return fail(friendlyDbError("호칭을 바꾸지 못했어요", error));
  revalidatePath("/", "layout"); // 기록·통계에 보이는 이름도 바뀐다
  return { message: "호칭을 바꿨어요." };
}
