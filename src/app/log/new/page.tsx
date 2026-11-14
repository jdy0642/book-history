import { BackHeader } from "@/components/back-header";
import { requireFamily } from "@/lib/auth";
import { todayKST } from "@/lib/date";
import { getRecentBooks } from "@/lib/logs";
import { LogForm } from "../log-form";

export const metadata = { title: "기록하기" };

export default async function NewLogPage() {
  const { family, data: books } = await requireFamily((supabase) => getRecentBooks(supabase, 8));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6">
      <BackHeader href="/" title="어떤 책을 읽었나요?" />
      <LogForm recentBooks={books} familyChildren={family.children} today={todayKST()} />
    </main>
  );
}
