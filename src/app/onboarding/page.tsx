import Link from "next/link";
import { getMyFamily, requireUser } from "@/lib/auth";
import { DeleteButton, LogoutButton } from "@/components/forms";
import { buttonClass, cardClass } from "@/components/styles";
import { deleteChild } from "./actions";
import { AddChildForm, CreateFamilyForm } from "./forms";

export const metadata = { title: "시작하기" };

export default async function OnboardingPage() {
  const { supabase } = await requireUser();
  const family = await getMyFamily(supabase);
  const children = family?.children ?? [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-4 py-10">
      <div className="flex items-center justify-between">
        <ol className="flex gap-2 text-xs font-medium text-muted">
          <li className={!family ? "text-accent" : ""}>1. 가족 만들기</li>
          <li aria-hidden>›</li>
          <li className={family ? "text-accent" : ""}>2. 아이 등록</li>
        </ol>
        <LogoutButton />
      </div>

      {!family ? (
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold">가족 이름을 정해 주세요</h1>
            <p className="mt-1 text-muted">나중에 배우자나 조부모님을 이 가족으로 초대할 수 있어요.</p>
          </div>
          <CreateFamilyForm />
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-muted">{family.name}</p>
            <h1 className="text-2xl font-bold">책을 읽어줄 아이를 등록해 주세요</h1>
            <p className="mt-1 text-muted">이름 대신 별명도 좋아요. 아이 정보는 최소한만 저장해요.</p>
          </div>

          {children.length > 0 && (
            <ul className="flex flex-col gap-2">
              {children.map((child) => (
                <li
                  key={child.id}
                  className={`${cardClass} flex items-center justify-between`}
                >
                  <span>
                    <span className="font-medium">{child.nickname}</span>
                    {child.birth_month && (
                      <span className="ml-2 text-sm text-muted">{child.birth_month.replace("-", "년 ")}월생</span>
                    )}
                  </span>
                  <DeleteButton action={deleteChild} id={child.id} label={`${child.nickname} 삭제`} />
                </li>
              ))}
            </ul>
          )}

          <AddChildForm isFirst={children.length === 0} />

          {children.length > 0 && (
            <Link href="/" className={`${buttonClass} mt-4 text-center`}>
              시작하기
            </Link>
          )}
        </section>
      )}
    </main>
  );
}
