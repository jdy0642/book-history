import Link from "next/link";
import { deleteLog } from "@/app/log/actions";
import { DeleteButton } from "@/components/forms";
import { cardClass } from "@/components/styles";
import type { Child } from "@/lib/auth";
import type { ReadingLog } from "@/lib/logs";
import { REACTIONS } from "@/lib/reactions";

/** 기록 한 건 (홈 "오늘", 달력의 날짜별 목록에서 공통 사용) */
export function LogItem({
  log,
  familyChildren,
  readerNames,
}: {
  log: ReadingLog;
  familyChildren: Child[];
  readerNames: Map<string, string>;
}) {
  const children = familyChildren
    .filter((c) => log.child_ids.includes(c.id))
    .map((c) => c.nickname)
    .join(", ");
  const reader = log.reader_user_id ? readerNames.get(log.reader_user_id) : undefined;

  return (
    <li className={`${cardClass} flex items-start justify-between gap-3`}>
      <Link href={`/log/${log.id}/edit`} className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {log.reaction && <span className="mr-1">{REACTIONS[log.reaction]}</span>}
          {log.book.title}
        </p>
        <p className="text-sm text-muted">
          {children}
          {reader && <> · 읽어준 사람: {reader}</>}
        </p>
        {log.memo && <p className="mt-1 text-sm">{log.memo}</p>}
      </Link>
      <DeleteButton action={deleteLog} id={log.id} label={`${log.book.title} 기록 삭제`} />
    </li>
  );
}
