import { notFound } from "next/navigation";
import { BackHeader } from "@/components/back-header";
import { DeleteButton } from "@/components/forms";
import { requireFamily } from "@/lib/auth";
import { historyHref, todayKST } from "@/lib/date";
import { getLog } from "@/lib/logs";
import { deleteLog } from "../../actions";
import { EditLogForm } from "../../log-form";

export const metadata = { title: "기록 수정" };

export default async function EditLogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 다른 가족의 기록은 RLS 로 조회되지 않는다
  const { family, data: log } = await requireFamily((supabase) => getLog(supabase, id));
  if (!log) notFound();
  const back = historyHref(log.read_on);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6">
      <BackHeader href={back} title="기록 수정">
        {/* 지운 뒤에는 이 화면이 사라지므로 그 날짜의 달력으로 돌아간다 */}
        <DeleteButton action={deleteLog} id={log.id} label={`${log.book.title} 기록 삭제`} next={back} />
      </BackHeader>
      <EditLogForm log={log} familyChildren={family.children} today={todayKST()} />
    </main>
  );
}
