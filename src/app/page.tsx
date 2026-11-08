import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

// 연결 상태는 요청마다 확인 (빌드 시점에 고정되지 않도록)
export const dynamic = "force-dynamic";

type Status ={ ok: boolean; message: string };

async function checkSupabase(): Promise<Status> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: ".env.local 에 Supabase URL / 키가 아직 없어요.",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("books")
    .select("id", { count: "exact", head: true });
  if (error) {
    return {
      ok: false,
      message: `연결은 됐지만 DB 확인 실패: ${error.message} (마이그레이션을 적용했나요?)`,
    };
  }
  return { ok: true, message: "Supabase 연결 및 DB 테이블 확인 완료" };
}

export default async function Home() {
  const status = await checkSupabase();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-6xl">📚</div>
      <h1 className="text-3xl font-bold">책 읽어준 날</h1>
      <p className="text-muted">아이에게 읽어준 책을 10초 만에 기록해요.</p>

      <div
        className={`w-full rounded-xl border px-4 py-3 text-sm ${
          status.ok
            ? "border-green-600/30 bg-green-600/10"
            : "border-accent/30 bg-accent/10"
        }`}
      >
        {status.ok ? "✅ " : "⚠️ "}
        {status.message}
      </div>
    </main>
  );
}
