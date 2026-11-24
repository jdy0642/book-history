"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form";
import { DISPLAY_NAME_MAX } from "@/lib/profile";
import { buttonClass, inputClass } from "./styles";

/** 폼 제출 중이면 비활성화되는 버튼 */
export function SubmitButton({
  children,
  pendingText = "잠시만요…",
  className = buttonClass,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ error, message }: Pick<NonNullable<FormState>, "error" | "message">) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="rounded-xl bg-green-600/10 px-4 py-3 text-sm">
        {message}
      </p>
    );
  }
  return null;
}

/** 가족 안에서의 호칭 입력칸 (가입·온보딩·가족 관리에서 같이 쓴다) */
export function DisplayNameInput({
  defaultValue,
  placeholder = "예: 아빠, 엄마, 할머니",
  className = inputClass,
}: {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      name="display_name"
      required
      maxLength={DISPLAY_NAME_MAX}
      placeholder={placeholder}
      defaultValue={defaultValue}
      className={className}
    />
  );
}
