import { deleteChild } from "@/app/onboarding/actions";
import { DeleteButton } from "@/components/forms";
import { cardClass } from "@/components/styles";
import type { Child } from "@/lib/auth";
import { formatBirthMonth } from "@/lib/date";

/** 아이 목록 + 삭제 (온보딩, 가족 관리 공통) */
export function ChildList({ items }: { items: Child[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((child) => (
        <li key={child.id} className={`${cardClass} flex items-center justify-between`}>
          <span>
            <span className="font-medium">{child.nickname}</span>
            {child.birth_month && (
              <span className="ml-2 text-sm text-muted">{formatBirthMonth(child.birth_month)}</span>
            )}
          </span>
          <DeleteButton action={deleteChild} id={child.id} label={`${child.nickname} 삭제`} />
        </li>
      ))}
    </ul>
  );
}
