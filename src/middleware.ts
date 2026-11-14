import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // 정적 파일·이미지·앱 아이콘·매니페스트는 제외 (로그인 세션이 필요 없다)
    "/((?!_next/static|_next/image|favicon.ico|icon$|icons/|apple-icon$|manifest\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
