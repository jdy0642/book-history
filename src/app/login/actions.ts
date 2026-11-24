"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import type { FormState } from "@/lib/form";
import { DISPLAY_NAME_ERROR, isValidDisplayName } from "@/lib/profile";
import { isKeepLogin, keepLoginCookie } from "@/lib/supabase/keep-login";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/url";

const ALREADY_REGISTERED = "이미 가입된 이메일이에요. 로그인해 주세요.";

function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "이메일 또는 비밀번호가 맞지 않아요.";
    case "email_not_confirmed":
      return "메일함에서 가입 확인 링크를 먼저 눌러 주세요.";
    case "user_already_exists":
    case "email_exists":
      return ALREADY_REGISTERED;
    case "weak_password":
      return "비밀번호가 너무 약해요. 6자 이상으로 정해 주세요.";
    case "email_address_invalid":
      return "이메일 주소를 다시 확인해 주세요.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
    default:
      console.error("[auth]", error.code, error.message);
      return "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  }
}

/**
 * "로그인 상태 유지" 선택을 쿠키에 기억하고, 그 선택으로 로그인할 Supabase 클라이언트를 만든다.
 * (이후 토큰을 갱신할 때도 미들웨어가 이 쿠키를 보고 같은 방식으로 쿠키를 쓴다)
 */
async function clientForLogin(formData: FormData) {
  (await cookies()).set(keepLoginCookie(isKeepLogin(formData.get("keep")?.toString())));
  return createClient();
}

/** 메일 링크·카카오 로그인이 돌아올 주소 (같은 사이트의 /auth/confirm). via: 실패 시 안내를 고르는 값 */
async function confirmUrl(next: string, via?: "kakao") {
  const origin = (await headers()).get("origin") ?? "";
  return `${origin}/auth/confirm?next=${encodeURIComponent(next)}${via ? `&via=${via}` : ""}`;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // 에러 시 입력값을 돌려줘서 폼에 다시 채운다 (비밀번호는 제외)
  const fail = (error: string): FormState => ({ error, values: { email } });
  if (!email || !password) return fail("이메일과 비밀번호를 입력해 주세요.");

  const supabase = await clientForLogin(formData);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(authErrorMessage(error));

  // next: 로그인 후 돌아갈 곳 (예: 초대 링크)
  redirect(safeNext(formData.get("next") as string | null));
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // 가입 후 갈 곳: 초대 링크로 들어왔으면 초대 화면, 아니면 온보딩
  const next = safeNext(formData.get("next") as string | null, "/onboarding");
  const fail = (error: string): FormState => ({ error, values: { display_name: name, email } });

  if (!isValidDisplayName(name)) return fail(DISPLAY_NAME_ERROR);
  if (!email) return fail("이메일을 입력해 주세요.");
  if (password.length < 6) return fail("비밀번호는 6자 이상이어야 해요.");

  const supabase = await clientForLogin(formData);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // DB 트리거가 profiles.display_name 으로 복사
      emailRedirectTo: await confirmUrl(next),
    },
  });
  if (error) return fail(authErrorMessage(error));

  // 이메일 확인을 꺼둔 경우 바로 로그인된다
  if (data.session) redirect(next);

  // 이메일 확인이 켜져 있으면 이미 가입된 주소도 에러 없이 빈 identities 로 돌아온다
  if (data.user && data.user.identities?.length === 0) {
    return fail(ALREADY_REGISTERED);
  }

  return {
    message: `${email} 로 가입 확인 메일을 보냈어요. 메일의 링크를 누르면 시작할 수 있어요.`,
  };
}

/**
 * 카카오 로그인 시작: 카카오 동의 화면으로 보낸다. 돌아오는 곳은 /auth/confirm (via=kakao: 실패 안내를 카카오용으로).
 * 처음이면 카카오 계정으로 가입되고(호칭은 카카오 닉네임), 홈이 온보딩으로 보낸다.
 */
export async function loginWithKakao(formData: FormData) {
  const next = safeNext(formData.get("next") as string | null);
  const supabase = await clientForLogin(formData);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: await confirmUrl(next, "kakao") },
  });
  if (error) {
    console.error("[auth] kakao", error.code, error.message);
    redirect("/login?error=kakao");
  }
  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
