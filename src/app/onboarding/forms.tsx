"use client";

import { useActionState } from "react";
import { DisplayNameInput, FormMessage, SubmitButton } from "@/components/ui";
import { inputClass, secondaryButtonClass } from "@/components/styles";
import { addChild, createFamily } from "./actions";

/** displayName: 카카오로 가입한 경우 호칭(처음엔 카카오 닉네임)도 함께 정한다 */
export function CreateFamilyForm({ displayName }: { displayName?: string }) {
  const [state, action] = useActionState(createFamily, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      {displayName !== undefined && (
        <label className="flex flex-col gap-1 text-sm text-muted">
          가족 안에서의 내 호칭
          <DisplayNameInput defaultValue={state?.values?.display_name ?? displayName} />
        </label>
      )}
      <input
        name="name"
        required
        maxLength={30}
        placeholder="예: 행복한 우리집"
        defaultValue={state?.values?.name}
        className={inputClass}
        autoFocus
      />
      <FormMessage {...state} />
      <SubmitButton pendingText="만드는 중…">가족 만들기</SubmitButton>
    </form>
  );
}

export function AddChildForm({ isFirst }: { isFirst: boolean }) {
  const [state, action] = useActionState(addChild, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input
        name="nickname"
        required
        maxLength={20}
        placeholder="아이 이름 또는 별명 (예: 콩이)"
        defaultValue={state?.values?.nickname}
        className={inputClass}
      />
      <label className="flex flex-col gap-1 text-sm text-muted">
        태어난 달 (선택)
        <input
          name="birth_month"
          type="month"
          defaultValue={state?.values?.birth_month}
          className={inputClass}
        />
      </label>
      <FormMessage {...state} />
      <SubmitButton pendingText="등록 중…" className={isFirst ? undefined : secondaryButtonClass}>
        {isFirst ? "아이 등록하기" : "+ 아이 더 등록하기"}
      </SubmitButton>
    </form>
  );
}
