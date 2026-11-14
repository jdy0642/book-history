import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteButton, LogoutButton } from "@/components/forms";
import { cardClass } from "@/components/styles";
import { SubmitButton } from "@/components/ui";
import { getMyFamily, isOnboarded, requireUser } from "@/lib/auth";
import { todayKST } from "@/lib/date";
import { getFamilyNames, getRecentLogs, recentBooks } from "@/lib/logs";
import { REACTIONS } from "@/lib/reactions";
import { deleteLog, quickLog } from "./log/actions";

export default async function Home() {
  const { supabase, user } = await requireUser();

  // 서로 독립적인 조회라 동시에 (기록은 RLS 로 내 가족 것만 보인다)
  const [family, logs, names] = await Promise.all([
    getMyFamily(supabase),
    getRecentLogs(supabase),
    getFamilyNames(supabase),
  ]);
  if (!isOnboarded(family)) redirect("/onboarding");

  const today = todayKST();
  const todayLogs = logs.filter((log) => log.read_on === today);
  const rereadBooks = recentBooks(logs, 6);

  const childName = new Map(family.children.map((c) => [c.id, c.nickname]));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{family.name}</p>
          <h1 className="text-xl font-bold">안녕하세요, {names.get(user.id) ?? "보호자"}님 👋</h1>
        </div>
        <LogoutButton />
      </header>

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
          <p className="rounded-xl bg-foreground/5 px-4 py-6 text-center text-sm text-muted">
            아직 기록이 없어요. 오늘은 어떤 책을 읽어줄까요?
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todayLogs.map((log) => (
              <li
                key={log.id}
                className={`${cardClass} flex items-start justify-between gap-3`}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {log.reaction && <span className="mr-1">{REACTIONS[log.reaction]}</span>}
                    {log.book.title}
                  </p>
                  <p className="text-sm text-muted">
                    {log.child_ids.map((id) => childName.get(id)).filter(Boolean).join(", ")}
                    {log.reader_user_id && names.has(log.reader_user_id) && (
                      <> · 읽어준 사람: {names.get(log.reader_user_id)}</>
                    )}
                  </p>
                  {log.memo && <p className="mt-1 text-sm">{log.memo}</p>}
                </div>
                <DeleteButton action={deleteLog} id={log.id} label={`${log.book.title} 기록 삭제`} />
              </li>
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
          <Link href="/onboarding" className="text-sm text-accent">
            관리
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
