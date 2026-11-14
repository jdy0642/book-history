import "server-only";
import type { BookInfo } from "@/lib/logs";

/** 카카오 책 검색 결과 중 앱에서 쓰는 값 */
export type KakaoBook = BookInfo & {
  isbn: string; // 13자리 우선, 없으면 10자리
  publisher: string;
};

/** 기록하기 화면에서 고른 책 (검색 API 응답 → 폼의 hidden 값) */
export type PickedBook = Pick<KakaoBook, "isbn" | "title" | "authors" | "cover_url">;

type KakaoDocument = {
  title: string;
  authors: string[];
  publisher: string;
  isbn: string; // "10자리 13자리" (둘 중 하나가 비어 있을 수 있음)
  thumbnail: string;
};

const ENDPOINT = "https://dapi.kakao.com/v3/search/book";

function pickIsbn(raw: string): string {
  const parts = raw.split(" ").filter(Boolean);
  return parts.find((p) => p.length === 13) ?? parts[0] ?? "";
}

/**
 * 카카오 책 검색. 키는 서버에서만 쓴다 (브라우저에 노출 금지).
 * target="isbn" 이면 ISBN 정확히 일치하는 책만.
 */
export async function searchKakaoBooks(
  query: string,
  { target, size = 10 }: { target?: "title" | "isbn"; size?: number } = {},
): Promise<KakaoBook[]> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error("KAKAO_REST_API_KEY 가 설정되지 않았어요.");

  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("size", String(size));
  if (target) url.searchParams.set("target", target);

  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
    // ISBN 조회(저장할 때)는 같은 책이 반복되니 하루 캐시, 제목 검색은 검색어가 매번 달라 캐시하지 않는다
    ...(target === "isbn" ? { next: { revalidate: 60 * 60 * 24 } } : { cache: "no-store" as const }),
  });
  if (!res.ok) {
    console.error("[kakao] search failed:", res.status, await res.text().catch(() => ""));
    throw new Error("책 검색에 실패했어요.");
  }

  const { documents } = (await res.json()) as { documents: KakaoDocument[] };
  return documents
    .map((d) => ({
      isbn: pickIsbn(d.isbn),
      title: d.title,
      authors: d.authors,
      publisher: d.publisher,
      cover_url: d.thumbnail || null,
    }))
    .filter((b) => b.isbn); // ISBN 없는 책은 같은 책인지 판별할 수 없어 제외
}
