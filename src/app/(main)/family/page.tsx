import Link from "next/link";
import { ChildList } from "@/components/child-list";
import { DeleteButton, LogoutButton } from "@/components/forms";
import { InstallCard } from "@/components/install-card";
import { cardClass } from "@/components/styles";
import { requireFamily } from "@/lib/auth";
import { formatDateKo, toDateKST } from "@/lib/date";
import { getActiveInvites, getMembers } from "@/lib/family";
import { getFamilyNames } from "@/lib/logs";
import { AddChildForm } from "../../onboarding/forms";
import { deleteInvite } from "./actions";
import { CreateInviteButton, ShareInviteLink } from "./invite-controls";

export const metadata = { title: "가족 관리" };

export default async function FamilyPage() {
  const {
    user,
    family,
    data: [names, members, invites],
  } = await requireFamily((supabase) =>
    Promise.all([getFamilyNames(supabase), getMembers(supabase), getActiveInvites(supabase)]),
  );

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-6">
      <header>
        <p className="text-sm text-muted">가족 관리</p>
        <h1 className="text-xl font-bold">{family.name}</h1>
      </header>

      <InstallCard />

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">구성원 {members.length}명</h2>
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.user_id} className={`${cardClass} flex items-center justify-between`}>
              <span className="font-medium">
                {names.get(m.user_id) ?? "보호자"}
                {m.user_id === user.id && <span className="ml-1 text-sm text-muted">(나)</span>}
              </span>
              <span className="text-sm text-muted">{m.role === "owner" ? "만든 사람" : "구성원"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">가족 초대</h2>
          <p className="text-sm text-muted">
            배우자나 조부모님께 링크를 보내면 같은 가족으로 함께 기록할 수 있어요. 링크는 7일 동안 쓸 수 있어요.
          </p>
        </div>
        {invites.length > 0 && (
          <ul className="flex flex-col gap-2">
            {invites.map((invite) => (
              <li key={invite.id} className={`${cardClass} flex items-center justify-between gap-3`}>
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-muted">{formatDateKo(toDateKST(invite.expires_at))}까지</span>
                  <ShareInviteLink token={invite.token} familyName={family.name} />
                </div>
                <DeleteButton action={deleteInvite} id={invite.id} label="초대 링크 삭제" />
              </li>
            ))}
          </ul>
        )}
        <CreateInviteButton hasInvites={invites.length > 0} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">우리 아이</h2>
        <ChildList items={family.children} />
        <AddChildForm isFirst={false} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">내 데이터</h2>
        <a href="/api/export" download className={`${cardClass} flex items-center justify-between`}>
          <span>
            <span className="block font-medium">읽기 기록 내려받기</span>
            <span className="block text-sm text-muted">우리 가족 기록 전체를 엑셀에서 열 수 있는 CSV 파일로</span>
          </span>
          <span aria-hidden>⬇︎</span>
        </a>
      </section>

      <footer className="flex flex-col items-center gap-3 pb-4 text-sm text-muted">
        <LogoutButton />
        <nav className="flex gap-4">
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy" className="font-semibold">
            개인정보처리방침
          </Link>
          <Link href="/account/delete">회원 탈퇴</Link>
        </nav>
      </footer>
    </main>
  );
}
