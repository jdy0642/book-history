import Link from "next/link";
import { LogoutButton } from "@/components/forms";
import { LogItem } from "@/components/log-item";
import { cardClass, emptyStateClass } from "@/components/styles";
import { SubmitButton } from "@/components/ui";
import { requireFamily } from "@/lib/auth";
import { todayKST } from "@/lib/date";
import { getFamilyNames, getRecentLogs, getStats, recentBooks } from "@/lib/logs";
import { quickLog } from "../log/actions";

export default async function Home() {
  const today = todayKST();
  // 가족 조회와 동시에 (기록은 RLS 로 내 가족 것만 보인다)
  const {
    user,
    family,
    data: [logs, names, stats],
  } = await requireFamily((supabase) =>
    Promise.all([getRecentLogs(supabase), getFamilyNames(supabase), getStats(supabase, today)]),
  );

  const todayLogs = logs.filter((log) => log.read_on === today);
  const rereadBooks = recentBooks(logs, 6);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{family.name}</p>
          <h1 className="text-xl font-bold">안녕하세요, {names.get(user.id) ?? "보호자"}님 👋</h1>
        </div>
        <LogoutButton />
      </header>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["지금까지", `${stats.total}권`],
          ["이번 달", `${stats.thisMonth}권`],
          ["연속 기록", stats.streak ? `🔥 ${stats.streak}일` : "0일"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-foreground/5 py-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-lg font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      <Link
        href="/log/new"
        className="rounded-2xl bg-accent px-4 py-8 text-center text-xl font-bold text-white shadow-sm active:scale-[0.99]"
      >
        + 책 읽었어요
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">
          오늘 읽은 책 <span className="text-accent">{todayLogs.length}권</span>
        </h2>
        {todayLogs.length === 0 ? (
          <p className={emptyStateClass}>
            아직 기록이 없어요. 오늘은 어떤 책을 읽어줄까요?
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todayLogs.map((log) => (
              <LogItem key={log.id} log={log} familyChildren={family.children} readerNames={names} />
            ))}
          </ul>
        )}
      </section>

      {rereadBooks.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-semibold">다시 읽기</h2>
            <p className="text-sm text-muted">누르면 오늘 날짜로, 아이 모두에게 바로 기록돼요.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {rereadBooks.map((book) => (
              <li key={book.id}>
                <form action={quickLog}>
                  <input type="hidden" name="book_id" value={book.id} />
                  <SubmitButton
                    pendingText="기록 중…"
                    className={`${cardClass} flex w-full items-center justify-between gap-3 text-left disabled:opacity-60`}
                  >
                    <span className="truncate font-medium">{book.title}</span>
                    <span className="shrink-0 text-sm text-accent">+ 다시 읽음</span>
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">우리 아이</h2>
          <Link href="/family" className="text-sm text-accent">
            가족 관리 · 초대
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2">
          {family.children.map((child) => (
            <li key={child.id} className="rounded-full bg-accent/10 px-4 py-2 text-sm font-medium">
              {child.nickname}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
