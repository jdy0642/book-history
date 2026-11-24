import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { hintClass } from "@/components/styles";
import { FormMessage } from "@/components/ui";
import { safeNext } from "@/lib/url";
import { AuthForm } from "./auth-form";

export const metadata = { title: "로그인" };

const ERRORS: Record<string, string> = {
  confirm: "확인 링크가 만료됐거나 올바르지 않아요. 다시 로그인하거나 가입해 주세요.",
  kakao: "카카오 로그인을 마치지 못했어요. 다시 시도해 주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; deleted?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ? safeNext(params.next) : undefined;
  const { user } = await getUser();
  if (user) redirect(next ?? "/");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <header className="text-center">
        <div className="text-5xl">📚</div>
        <h1 className="mt-3 text-2xl font-bold">책 읽어준 날</h1>
        <p className="mt-1 text-muted">아이에게 읽어준 책을 10초 만에 기록해요.</p>
      </header>

      {params.deleted && <FormMessage message="탈퇴가 끝났어요. 그동안 이용해 주셔서 고마워요." />}

      {next?.startsWith("/invite/") && (
        <p className={`${hintClass} text-center`}>
          가족 초대를 받았어요. <b>카카오로 시작</b>하거나, 이메일로 가입·로그인해 주세요.
        </p>
      )}

      <AuthForm
        next={next}
        initialError={params.error && Object.hasOwn(ERRORS, params.error) ? ERRORS[params.error] : undefined}
      />

      <p className="text-center text-xs text-muted">
        가입하면 <Link href="/terms" className="underline">이용약관</Link>과{" "}
        <Link href="/privacy" className="underline">개인정보처리방침</Link>에 동의하게 돼요.
      </p>
    </main>
  );
}
