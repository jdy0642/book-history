"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { dangerButtonClass, inputClass } from "@/components/styles";
import { DELETE_CONFIRM_WORD } from "@/lib/account";
import { deleteAccount } from "../actions";

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-2 text-sm">
        <span>
          계속하려면 <b>{DELETE_CONFIRM_WORD}</b>라고 입력해 주세요.
        </span>
        <input name="confirm" required autoComplete="off" className={inputClass} />
      </label>
      <FormMessage {...state} />
      <SubmitButton pendingText="탈퇴하는 중…" className={dangerButtonClass}>
        탈퇴하기
      </SubmitButton>
    </form>
  );
}
