"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import type { FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

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
      return `문제가 생겼어요: ${error.message}`;
  }
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // 에러 시 입력값을 돌려줘서 폼에 다시 채운다 (비밀번호는 제외)
  const fail = (error: string): FormState => ({ error, values: { email } });
  if (!email || !password) return fail("이메일과 비밀번호를 입력해 주세요.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return fail(authErrorMessage(error));

  redirect("/");
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fail = (error: string): FormState => ({ error, values: { name, email } });

  if (!name || name.length > 30) return fail("호칭을 1~30자로 입력해 주세요. (예: 아빠, 엄마)");
  if (!email) return fail("이메일을 입력해 주세요.");
  if (password.length < 6) return fail("비밀번호는 6자 이상이어야 해요.");

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }, // DB 트리거가 profiles.display_name 으로 복사
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
    },
  });
  if (error) return fail(authErrorMessage(error));

  // 이메일 확인을 꺼둔 경우 바로 로그인된다
  if (data.session) redirect("/onboarding");

  // 이메일 확인이 켜져 있으면 이미 가입된 주소도 에러 없이 빈 identities 로 돌아온다
  if (data.user && data.user.identities?.length === 0) {
    return fail(ALREADY_REGISTERED);
  }

  return {
    message: `${email} 로 가입 확인 메일을 보냈어요. 메일의 링크를 누르면 시작할 수 있어요.`,
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
