import type { CookieOptions } from "@supabase/ssr";

/**
 * "로그인 상태 유지" 선택을 기억하는 쿠키 ("0" 이면 끔, 없거나 그 밖의 값이면 켬).
 * 켜면 Supabase 기본값대로 로그인 쿠키가 오래(400일) 남고, 끄면 브라우저를 닫을 때 사라진다.
 */
export const KEEP_LOGIN_COOKIE = "keep_login";

export const isKeepLogin = (value: string | undefined) => value !== "0";

/** 로그인할 때 선택을 기억하는 쿠키 (cookies().set 에 그대로 넘긴다) */
export const keepLoginCookie = (keep: boolean) => ({
  name: KEEP_LOGIN_COOKIE,
  value: keep ? "1" : "0",
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
});

/**
 * 로그인 유지를 껐으면 로그인 쿠키에서 만료 시각을 빼 세션 쿠키로 만든다.
 * 쿠키를 지우는 요청(maxAge 0)은 그대로 둬야 로그아웃이 된다.
 */
export function cookieOptions(options: CookieOptions, keep: boolean): CookieOptions {
  if (keep || !options.maxAge || options.maxAge <= 0) return options;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...rest } = options;
  return rest;
}
