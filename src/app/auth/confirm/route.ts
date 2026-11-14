import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/url";

/**
 * 가입 확인 메일의 링크가 도착하는 곳.
 * - token_hash 방식: 메일 템플릿을 /auth/confirm?token_hash=...&type=email 로 바꾼 경우 (다른 브라우저에서 열어도 동작)
 * - code 방식: 기본 템플릿 (가입한 같은 브라우저에서 열어야 동작)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();

  const { error } =
    tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: "missing token" };

  redirect(error ? "/login?error=confirm" : next);
}
