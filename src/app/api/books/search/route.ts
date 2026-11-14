import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { toIsbn13 } from "@/lib/isbn";
import { searchKakaoBooks } from "@/lib/kakao";

/** 기록하기 화면의 책 검색 (제목 또는 ISBN). 로그인한 사용자만 (카카오 키를 남이 쓰지 못하게) */
export async function GET(request: NextRequest) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query || query.length > 100) return NextResponse.json({ books: [] });

  try {
    // 바코드로 읽었거나 ISBN 을 입력했으면 그 책만 정확히 찾는다
    const isbn = toIsbn13(query);
    const books = isbn ? await searchKakaoBooks(isbn, { target: "isbn" }) : await searchKakaoBooks(query);
    return NextResponse.json({ books });
  } catch {
    return NextResponse.json({ error: "책 검색에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
