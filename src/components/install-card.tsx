"use client";

import { useEffect, useState } from "react";
import { hintClass, smallButtonClass } from "@/components/styles";

/** Chrome·삼성인터넷 등이 "설치할 수 있음"을 알려줄 때 오는 이벤트 (표준 타입에 아직 없음) */
type InstallPromptEvent = Event & { prompt: () => Promise<void> };

declare global {
  interface Window {
    __installPrompt?: InstallPromptEvent; // src/app/layout.tsx 의 인라인 스크립트가 받아 둔다
  }
}

type Install = { kind: "ios" } | { kind: "prompt"; event: InstallPromptEvent } | null;

function isIOS() {
  // iPadOS 13+ 는 데스크톱 Mac 처럼 보고하므로 터치 지원으로 구분
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

/**
 * 홈 화면 설치 안내.
 * - 이미 앱으로 열었으면 숨김
 * - 안드로이드(설치 이벤트를 받았으면): "앱으로 설치" 버튼
 * - iPhone·iPad Safari: 공유 → 홈 화면에 추가 안내 (iOS 는 설치 버튼을 띄울 수 없다)
 */
export function InstallCard() {
  const [install, setInstall] = useState<Install>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const fromPrompt = () => window.__installPrompt && setInstall({ kind: "prompt", event: window.__installPrompt });
    if (isIOS()) setInstall({ kind: "ios" });
    fromPrompt(); // 이 화면에 오기 전에 이미 받아 둔 경우

    const onInstalled = () => setInstall(null);
    window.addEventListener("installprompt", fromPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("installprompt", fromPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!install) return null;

  return (
    <section className={`${hintClass} flex flex-col gap-2`}>
      <p className="font-semibold">📱 홈 화면에 앱으로 설치하기</p>
      {install.kind === "ios" ? (
        <p>
          Safari 아래쪽의 <b>공유 버튼(□↑)</b> → <b>홈 화면에 추가</b>를 누르면 앱처럼 바로 열 수 있어요.
        </p>
      ) : (
        <>
          <p>설치하면 잠들기 전 아이 옆에서 한 번에 열어 기록할 수 있어요.</p>
          <button
            type="button"
            className={`${smallButtonClass} self-start`}
            onClick={async () => {
              await install.event.prompt();
              window.__installPrompt = undefined; // 설치 창은 한 번만 띄울 수 있다
              setInstall(null);
            }}
          >
            앱으로 설치
          </button>
        </>
      )}
    </section>
  );
}
