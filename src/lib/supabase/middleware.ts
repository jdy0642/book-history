import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "./env";
import { cookieOptions, isKeepLogin, KEEP_LOGIN_COOKIE } from "./keep-login";

/** 요청마다 로그인 세션(토큰)을 갱신해서 쿠키에 다시 써준다 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // 아직 Supabase 를 연결하지 않았으면 그냥 통과
  if (!isSupabaseConfigured) return response;

  const keep = isKeepLogin(request.cookies.get(KEEP_LOGIN_COOKIE)?.value);
  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, cookieOptions(options, keep)),
        );
      },
    },
  });

  // 주의: createServerClient 와 getUser 사이에 다른 코드를 넣지 말 것
  await supabase.auth.getUser();

  return response;
}
