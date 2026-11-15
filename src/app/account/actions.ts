"use server";

import { redirect } from "next/navigation";
import { DELETE_CONFIRM_WORD } from "@/lib/account";
import { friendlyDbError } from "@/lib/errors";
import type { FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

/** 회원 탈퇴. 가족·기록 정리는 DB 가 처리한다 (delete_my_account + 구성원 삭제 트리거) */
export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("confirm") ?? "").trim() !== DELETE_CONFIRM_WORD) {
    return { error: `확인을 위해 "${DELETE_CONFIRM_WORD}"라고 입력해 주세요.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: friendlyDbError("탈퇴하지 못했어요", error) };

  // 계정이 이미 지워져 서버 로그아웃은 실패할 수 있다. 이 기기의 로그인 쿠키만 지우면 된다.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
