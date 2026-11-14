"use client";

import { useActionState, useEffect, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui";
import { secondaryButtonClass, smallButtonClass, smallSecondaryButtonClass } from "@/components/styles";
import { createInvite } from "./actions";

export function CreateInviteButton({ hasInvites }: { hasInvites: boolean }) {
  const [state, action] = useActionState(createInvite, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormMessage {...state} />
      <SubmitButton pendingText="만드는 중…" className={hasInvites ? secondaryButtonClass : undefined}>
        {hasInvites ? "+ 초대 링크 하나 더 만들기" : "초대 링크 만들기"}
      </SubmitButton>
    </form>
  );
}

/** 초대 링크 복사 / 공유 (주소는 지금 열려 있는 사이트 기준으로 만든다) */
export function ShareInviteLink({ token, familyName }: { token: string; familyName: string }) {
  const [copied, setCopied] = useState(false);
  // 공유 기능은 브라우저에서만 알 수 있어서 화면이 붙은 뒤에 확인 (서버 렌더링과 어긋나지 않게)
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare("share" in navigator), []);

  function link() {
    return `${window.location.origin}/invite/${token}`;
  }

  async function copy() {
    await navigator.clipboard.writeText(link());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({
        title: "책 읽어준 날 가족 초대",
        text: `‘${familyName}’ 가족에서 아이에게 읽어준 책을 같이 기록해요.`,
        url: link(),
      });
    } catch {
      // 사용자가 공유 창을 닫은 경우 등은 무시
    }
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={copy} className={smallButtonClass}>
        {copied ? "복사했어요!" : "링크 복사"}
      </button>
      {canShare && (
        <button type="button" onClick={share} className={smallSecondaryButtonClass}>
          공유
        </button>
      )}
    </div>
  );
}
