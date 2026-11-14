import Link from "next/link";
import { getMyFamily, requireUser } from "@/lib/auth";
import { ChildList } from "@/components/child-list";
import { LogoutButton } from "@/components/forms";
import { buttonClass, hintClass } from "@/components/styles";
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
            <p className={`${hintClass} mt-3`}>
              가족에게 <b>초대 링크</b>를 받았다면, 가족을 새로 만들지 말고 그 링크를 열어 주세요.
            </p>
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

          <ChildList items={children} />

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
