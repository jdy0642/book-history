"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/form";
import { buttonClass } from "./styles";

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
