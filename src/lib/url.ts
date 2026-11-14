const BASE = "http://app.invalid";

/**
 * 외부 사이트로 튕기지 않도록 앱 내부 경로만 허용 (로그인 후 이동, 삭제 후 이동 등).
 *
 * "/" 로 시작한다는 것만으로는 부족하다: 브라우저는 "/\evil.com" 의 역슬래시를 "/" 로 바꿔
 * "//evil.com"(다른 사이트)로 읽는다. 그래서 역슬래시·공백·제어 문자를 거절하고,
 * 마지막으로 우리 사이트 기준으로 해석했을 때 같은 사이트인지 확인한다.
 */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\s\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    return new URL(next, BASE).origin === BASE ? next : fallback;
  } catch {
    return fallback;
  }
}
