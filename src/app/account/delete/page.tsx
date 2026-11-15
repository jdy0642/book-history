import Link from "next/link";
import { BackHeader } from "@/components/back-header";
import { cardClass } from "@/components/styles";
import { getMyFamily, requireUser } from "@/lib/auth";
import { getMembers } from "@/lib/family";
import { DeleteAccountForm } from "./delete-form";

export const metadata = { title: "회원 탈퇴" };

export default async function DeleteAccountPage() {
  const { supabase } = await requireUser();
  const [family, members] = await Promise.all([getMyFamily(supabase), getMembers(supabase)]);
  // 실제 정리 규칙은 DB 트리거(20261119000000_family_member_cleanup.sql)에 있다. 바꾸면 아래 안내도 함께 고칠 것
  const alone = members.length <= 1;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-6">
      <BackHeader href="/family" title="회원 탈퇴" />

      <section className={`${cardClass} flex flex-col gap-2 text-sm`}>
        <p className="font-semibold">탈퇴하면 이렇게 돼요</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>내 계정(이메일)과 호칭이 바로 지워지고, 다시 로그인할 수 없어요.</li>
          {family &&
            (alone ? (
              <li>
                <b>{family.name}</b>에 나 혼자라서 가족, 아이 정보, 모든 읽기 기록이 <b>함께 지워져요.</b> 되돌릴 수
                없어요.
              </li>
            ) : (
              <li>
                <b>{family.name}</b>의 아이 정보와 읽기 기록은 남은 가족({members.length - 1}명)이 계속 쓸 수 있게
                그대로 남아요. 내가 기록한 항목의 &quot;읽어준 사람&quot;만 비워져요.
              </li>
            ))}
        </ul>
      </section>

      {family && (
        <p className="text-sm text-muted">
          기록을 보관하고 싶다면 먼저{" "}
          <a href="/api/export" className="font-medium text-accent underline">
            읽기 기록 내려받기(CSV)
          </a>
          를 해 두세요.
        </p>
      )}

      <DeleteAccountForm />

      <Link href="/family" className="text-center text-sm text-muted">
        취소
      </Link>
    </main>
  );
}
