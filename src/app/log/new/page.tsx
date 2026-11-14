import Link from "next/link";
import { requireFamily } from "@/lib/auth";
import { todayKST } from "@/lib/date";
import { getRecentLogs, recentBooks } from "@/lib/logs";
import { LogForm } from "./log-form";

export const metadata = { title: "기록하기" };

export default async function NewLogPage() {
  const { supabase, family } = await requireFamily();
  const books = recentBooks(await getRecentLogs(supabase), 8);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-muted" aria-label="홈으로">
          ←
        </Link>
        <h1 className="text-xl font-bold">어떤 책을 읽었나요?</h1>
      </header>

      <LogForm recentBooks={books} familyChildren={family.children} today={todayKST()} />
    </main>
  );
}
