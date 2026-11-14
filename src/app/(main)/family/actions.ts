"use server";

import { revalidatePath } from "next/cache";
import { requireFamily } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import type { FormState } from "@/lib/form";
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
