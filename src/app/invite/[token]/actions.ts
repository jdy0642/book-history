"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { friendlyDbError } from "@/lib/errors";
import type { FormState } from "@/lib/form";

// 초대 수락 함수가 내는 에러 (마이그레이션 20261116000000)
const INVITE_ERRORS: Record<string, string> = {
  P0002: "초대 링크가 만료됐거나 올바르지 않아요. 초대한 분께 새 링크를 요청해 주세요.",
  P0003: "이미 다른 가족에 속해 있어요. 한 계정은 한 가족에만 들어갈 수 있어요.",
};

export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const { supabase } = await requireUser();

  const { error } = await supabase.rpc("accept_family_invite", { invite_token: token });
  if (error) return { error: INVITE_ERRORS[error.code] ?? friendlyDbError("초대를 수락하지 못했어요", error) };

  revalidatePath("/", "layout");
  redirect("/"); // 아이가 아직 없는 가족이면 홈이 온보딩으로 보낸다
}
