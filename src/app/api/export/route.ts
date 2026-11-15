import { NextResponse } from "next/server";
import { getMyFamily, getUser } from "@/lib/auth";
import { todayKST } from "@/lib/date";
import { friendlyDbError } from "@/lib/errors";
import { getAllLogs, getFamilyNames } from "@/lib/logs";
import { REACTIONS } from "@/lib/reactions";

/** 숫자·쉼표·따옴표·줄바꿈이 섞여도 엑셀이 한 칸으로 읽게. 수식으로 해석될 수 있는 값은 앞에 ' 를 붙인다 */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** 우리 가족 읽기 기록 전체를 CSV 로 내려받기 (내 데이터는 내가 가져갈 수 있게) */
export async function GET() {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  // 모두 RLS 로 내 가족 것만 조회된다
  let family, names, logs;
  try {
    [family, names, logs] = await Promise.all([getMyFamily(supabase), getFamilyNames(supabase), getAllLogs(supabase)]);
  } catch (error) {
    const message = friendlyDbError("기록을 불러오지 못했어요", error as { code?: string; message: string });
    return NextResponse.json({ error: message }, { status: 500 });
  }
  if (!family) return NextResponse.json({ error: "가족이 없어요." }, { status: 404 });
  const childNames = new Map(family.children.map((c) => [c.id, c.nickname]));

  const header = ["읽은 날", "책 제목", "지은이", "출판사", "ISBN", "아이", "읽어준 사람", "반응", "메모"];
  const lines = logs.map((log) =>
    [
      log.read_on,
      log.book.title,
      log.book.authors.join(", "),
      log.book.publisher ?? "",
      log.book.isbn ?? "",
      log.child_ids.flatMap((id) => childNames.get(id) ?? []).join(", "),
      (log.reader_user_id && names.get(log.reader_user_id)) ?? "",
      log.reaction ? REACTIONS[log.reaction] : "",
      log.memo ?? "",
    ]
      .map(cell)
      .join(","),
  );
  // BOM: 엑셀이 한글을 UTF-8 로 읽도록
  const csv = "\uFEFF" + [header.join(","), ...lines].join("\r\n") + "\r\n";

  const today = todayKST();
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reading-logs-${today}.csv"; filename*=UTF-8''${encodeURIComponent(`책읽어준날-기록-${today}.csv`)}`,
      "Cache-Control": "no-store",
    },
  });
}
