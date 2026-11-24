import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./env";
import { cookieOptions, isKeepLogin, KEEP_LOGIN_COOKIE } from "./keep-login";

/**
 * 서버 컴포넌트 / Server Action / Route Handler 용 Supabase 클라이언트.
 * 로그인 쿠키는 "로그인 상태 유지" 선택(keep_login 쿠키)에 맞춰 쓴다.
 * (서버 액션에서 방금 set 한 쿠키도 같은 요청의 get 에 보인다)
 */
export async function createClient() {
  const cookieStore = await cookies();
  const keep = isKeepLogin(cookieStore.get(KEEP_LOGIN_COOKIE)?.value);

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, cookieOptions(options, keep)),
          );
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없음 — middleware 가 세션을 갱신하므로 무시해도 됨
        }
      },
    },
  });
}
