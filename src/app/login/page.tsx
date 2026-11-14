import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "./auth-form";

export const metadata = { title: "로그인" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await getUser();
  if (user) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-4 py-10">
      <header className="text-center">
        <div className="text-5xl">📚</div>
        <h1 className="mt-3 text-2xl font-bold">책 읽어준 날</h1>
        <p className="mt-1 text-muted">아이에게 읽어준 책을 10초 만에 기록해요.</p>
      </header>

      <AuthForm
        initialError={
          error === "confirm"
            ? "확인 링크가 만료됐거나 올바르지 않아요. 다시 로그인하거나 가입해 주세요."
            : undefined
        }
      />
    </main>
  );
}
