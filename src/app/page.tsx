import Link from "next/link";
import { redirect } from "next/navigation";
import { getDisplayName, getMyFamily, requireUser } from "@/lib/auth";
import { logout } from "./login/actions";

export default async function Home() {
  const { supabase, user } = await requireUser();

  // 서로 독립적인 조회라 동시에
  const [family, displayName] = await Promise.all([
    getMyFamily(supabase),
    getDisplayName(supabase, user.id),
  ]);
  if (!family || family.children.length === 0) redirect("/onboarding");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{family.name}</p>
          <h1 className="text-xl font-bold">안녕하세요, {displayName}님 👋</h1>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm text-muted">
            로그아웃
          </button>
        </form>
      </header>

      <button
        type="button"
        disabled
        className="rounded-2xl bg-accent px-4 py-8 text-xl font-bold text-white opacity-60"
      >
        + 책 읽었어요
        <span className="mt-1 block text-sm font-normal">곧 추가돼요</span>
      </button>

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
