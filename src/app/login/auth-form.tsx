"use client";

import { useActionState, useState } from "react";
import { DisplayNameInput, FormMessage, SubmitButton } from "@/components/ui";
import { inputClass, segmentClass, segmentedClass } from "@/components/styles";
import { login, loginWithKakao, signup } from "./actions";

type Mode = "login" | "signup";

/** 각 폼에 실어 보내는 공통 값 (로그인 후 갈 곳, 로그인 상태 유지) */
function CommonFields({ next, keep }: { next?: string; keep: boolean }) {
  return (
    <>
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="keep" value={keep ? "1" : "0"} />
    </>
  );
}

export function AuthForm({ initialError, next }: { initialError?: string; next?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  // 로그인 상태 유지: 기본으로 켜 둔다 (끄면 브라우저를 닫을 때 로그아웃)
  const [keep, setKeep] = useState(true);

  return (
    <div className="flex flex-col gap-6">
      <form action={loginWithKakao}>
        <CommonFields next={next} keep={keep} />
        <SubmitButton pendingText="카카오로 이동 중…" className={kakaoButtonClass}>
          <KakaoSymbol />
          카카오로 시작하기
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-foreground/10" />
        또는 이메일로
        <span className="h-px flex-1 bg-foreground/10" />
      </div>

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
        <LoginForm key="login" initialError={initialError} next={next} keep={keep} />
      ) : (
        <SignupForm key="signup" next={next} keep={keep} />
      )}

      <label className="flex items-center justify-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={keep}
          onChange={(e) => setKeep(e.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
        로그인 상태 유지
        <span className="text-muted">(공용 기기에서는 꺼 주세요)</span>
      </label>
    </div>
  );
}

// 카카오 로그인 버튼 디자인 가이드: 노란 배경 #FEE500, 검정 85% 글자, 말풍선 심볼
const kakaoButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 py-3 text-base font-semibold text-black/85 disabled:opacity-60";

function KakaoSymbol() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="currentColor"
        d="M12 3C6.48 3 2 6.48 2 10.78c0 2.79 1.86 5.23 4.66 6.6l-.95 3.48c-.08.31.27.56.54.38l4.14-2.74c.53.06 1.07.09 1.61.09 5.52 0 10-3.48 10-7.81S17.52 3 12 3z"
      />
    </svg>
  );
}

function LoginForm({ initialError, next, keep }: { initialError?: string; next?: string; keep: boolean }) {
  const [state, action] = useActionState(login, initialError ? { error: initialError } : undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <CommonFields next={next} keep={keep} />
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

function SignupForm({ next, keep }: { next?: string; keep: boolean }) {
  const [state, action] = useActionState(signup, undefined);
  if (state?.message) return <FormMessage message={state.message} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <CommonFields next={next} keep={keep} />
      <DisplayNameInput
        placeholder="가족 안에서의 호칭 (예: 아빠, 엄마, 할머니)"
        defaultValue={state?.values?.display_name}
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
