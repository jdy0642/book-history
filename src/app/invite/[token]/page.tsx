import Link from "next/link";
import { buttonClass, emptyStateClass } from "@/components/styles";
import { getMyFamily } from "@/lib/auth";
import { getInvitePreview } from "@/lib/family";
import { createClient } from "@/lib/supabase/server";
import { AcceptInviteForm } from "./accept-form";

export const metadata = { title: "가족 초대" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  // 로그인 확인·초대 정보·내 가족을 한 번에 (로그인 전이면 내 가족은 RLS 로 null)
  const [
    {
      data: { user },
    },
    preview,
    myFamily,
  ] = await Promise.all([supabase.auth.getUser(), getInvitePreview(supabase, token), getMyFamily(supabase)]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-10 text-center">
      <div className="text-5xl">💌</div>
      <InviteBody token={token} preview={preview} loggedIn={!!user} myFamilyName={myFamily?.name} />
      <Link href="/" className="text-sm text-muted">
        홈으로
      </Link>
    </main>
  );
}

function InviteBody({
  token,
  preview,
  loggedIn,
  myFamilyName,
}: {
  token: string;
  preview: Awaited<ReturnType<typeof getInvitePreview>>;
  loggedIn: boolean;
  myFamilyName?: string;
}) {
  if (!preview) {
    return <p className={emptyStateClass}>초대 링크가 올바르지 않아요. 링크를 다시 확인해 주세요.</p>;
  }
  if (preview.expired) {
    return (
      <p className={emptyStateClass}>
        초대 링크가 만료됐어요. {preview.inviter_name ?? "초대한 분"}께 새 링크를 요청해 주세요.
      </p>
    );
  }

  let action;
  if (!loggedIn) {
    action = (
      <Link href={`/login?next=/invite/${encodeURIComponent(token)}`} className={buttonClass}>
        로그인하고 참여하기
      </Link>
    );
  } else if (myFamilyName && myFamilyName !== preview.family_name) {
    // 다른 가족에 이미 속해 있으면 미리 알려준다 (이름이 같은 다른 가족이어도 최종 확인은 DB 가 한다)
    action = (
      <p className={emptyStateClass}>
        이미 ‘{myFamilyName}’ 가족에 속해 있어요. 한 계정은 한 가족에만 들어갈 수 있어요.
      </p>
    );
  } else {
    action = <AcceptInviteForm token={token} />;
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">‘{preview.family_name}’ 가족 초대</h1>
        <p className="mt-2 text-muted">{preview.inviter_name ?? "가족"}님이 함께 책 읽기를 기록하자고 초대했어요.</p>
      </div>
      {action}
    </>
  );
}
