import type { SupabaseClient } from "@supabase/supabase-js";

/** 가족 안에서의 호칭 (profiles.display_name, DB 제약: 1~30자) */
export const DISPLAY_NAME_MAX = 30;

export const DISPLAY_NAME_ERROR = `호칭을 1~${DISPLAY_NAME_MAX}자로 입력해 주세요. (예: 아빠, 엄마)`;

export const isValidDisplayName = (name: string) => name.length >= 1 && name.length <= DISPLAY_NAME_MAX;

/** 내 호칭 바꾸기 (본인 프로필만 고칠 수 있다 — RLS) */
export async function updateDisplayName(supabase: SupabaseClient, userId: string, name: string) {
  return supabase.from("profiles").update({ display_name: name }).eq("id", userId);
}
