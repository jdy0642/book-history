"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { inputClass, segmentClass, segmentedClass } from "@/components/styles";
import { login, signup } from "./actions";

type Mode = "login" | "signup";

export function AuthForm({ initialError, next }: { initialError?: string; next?: string }) {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" className={segmentedClass}>
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={segmentClass(mode === m)}
          >
            {m === "login" ? "로그인" : "회원가입"}
          </button>
        ))}
      </div>

      {/* key 로 탭 전환 시 폼 상태 초기화 */}
      {mode === "login" ? (
        <LoginForm key="login" initialError={initialError} next={next} />
      ) : (
        <SignupForm key="signup" next={next} />
      )}
    </div>
  );
}

function LoginForm({ initialError, next }: { initialError?: string; next?: string }) {
  const [state, action] = useActionState(login, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="이메일"
        defaultValue={state?.values?.email}
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="비밀번호"
        className={inputClass}
      />
      <FormMessage {...state} />
      <SubmitButton pendingText="로그인 중…">로그인</SubmitButton>
    </form>
  );
}

function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signup, undefined);
  if (state?.message) return <FormMessage message={state.message} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      {next && <input type="hidden" name="next" value={next} />}
      <input
        name="name"
        required
        maxLength={30}
        placeholder="가족 안에서의 호칭 (예: 아빠, 엄마, 할머니)"
        defaultValue={state?.values?.name}
        className={inputClass}
      />
      <input
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="이메일"
        defaultValue={state?.values?.email}
        className={inputClass}
      />
      <input
        name="password"
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        placeholder="비밀번호 (6자 이상)"
        className={inputClass}
      />
      <FormMessage {...state} />
      <SubmitButton pendingText="가입 중…">가입하기</SubmitButton>
    </form>
  );
}
