"use client";

import { useActionState } from "react";
import { DisplayNameInput, FormMessage, SubmitButton } from "@/components/ui";
import { smallButtonClass } from "@/components/styles";
import { changeDisplayName } from "./actions";

export function DisplayNameForm({ current }: { current: string }) {
  const [state, action] = useActionState(changeDisplayName, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted">
          가족에게 보이는 내 호칭
          <DisplayNameInput defaultValue={state?.values?.display_name ?? current} />
        </label>
        <SubmitButton pendingText="저장 중…" className={`${smallButtonClass} shrink-0`}>
          저장
        </SubmitButton>
      </div>
      <FormMessage {...state} />
    </form>
  );
}
