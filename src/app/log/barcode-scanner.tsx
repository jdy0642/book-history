"use client";

import { useEffect, useRef, useState } from "react";
import { FormMessage } from "@/components/ui";
import { smallSecondaryButtonClass } from "@/components/styles";
import type { DecodeHintType as HintType } from "@zxing/library";
import { toIsbn13 } from "@/lib/isbn";

/** 영상 한 프레임에서 바코드 글자를 읽는다 (못 읽으면 null) */
type Detect = (video: HTMLVideoElement) => Promise<string | null>;

// 크롬(안드로이드) 내장 바코드 인식기. 표준 타입에 아직 없어 필요한 만큼만 선언
type NativeDetector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type NativeDetectorClass = {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats: () => Promise<string[]>;
};

/** 내장 인식기가 있으면 그걸, 없으면(iPhone 등) zxing 을 그때 불러와 쓴다 */
async function createDetector(): Promise<Detect> {
  const Native = (window as Window & { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (Native && (await Native.getSupportedFormats()).includes("ean_13")) {
    const detector = new Native({ formats: ["ean_13"] });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  }

  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import("@zxing/browser"),
    import("@zxing/library"),
  ]);
  const reader = new BrowserMultiFormatReader(
    new Map<HintType, unknown>([
      [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]],
      [DecodeHintType.TRY_HARDER, true],
    ]),
  );
  // 가이드 상자 근처(가운데 띠)만 잘라 읽는다. 전체 화면을 매번 읽는 것보다 훨씬 가볍다.
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!; // 매 프레임 픽셀을 읽으므로 CPU 쪽에 둔다
  return async (video) => {
    const sx = video.videoWidth * 0.1;
    const sy = video.videoHeight * 0.25;
    const w = video.videoWidth - sx * 2;
    const h = video.videoHeight - sy * 2;
    // 크기를 다시 넣으면 캔버스를 새로 할당하므로 바뀔 때만
    if (canvas.width !== w || canvas.height !== h) [canvas.width, canvas.height] = [w, h];
    ctx.drawImage(video, sx, sy, w, h, 0, 0, w, h);
    try {
      return reader.decodeFromCanvas(canvas).getText();
    } catch {
      return null; // 이 프레임에는 바코드가 없음
    }
  };
}

function cameraError(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError") return "카메라 권한이 꺼져 있어요. 브라우저 설정에서 카메라를 허용해 주세요.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "사용할 수 있는 카메라가 없어요.";
  return "카메라를 열지 못했어요. 제목으로 검색해 주세요.";
}

/**
 * 책 뒷면 바코드(ISBN)를 카메라로 읽는 전체 화면 창.
 * 책 ISBN(978·979, 검증 숫자 일치)이 읽히면 onDetect 를 부르고, 창은 부모가 닫는다.
 */
export function BarcodeScanner({ onDetect, onClose }: { onDetect: (isbn: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // 부모가 다시 그려져 함수가 바뀌어도 카메라를 다시 켜지 않도록 최신 함수만 ref 로 들고 있는다
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
        const [media, detect] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          }),
          createDetector(),
        ]);
        stream = media;
        // 카메라가 열리기 전에 창을 닫았으면 정리 함수가 이미 지나갔으니 여기서 끈다
        if (stopped) return media.getTracks().forEach((t) => t.stop());
        const video = videoRef.current!;
        video.srcObject = media;
        await video.play();

        const tick = async () => {
          if (stopped) return;
          const isbn = video.readyState >= 2 ? toIsbn13((await detect(video)) ?? "") : null;
          if (stopped) return;
          if (isbn) onDetectRef.current(isbn);
          else timer = setTimeout(tick, 150);
        };
        tick();
      } catch (e) {
        if (!stopped) setError(cameraError(e));
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="바코드 스캔"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4 text-white"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
        {!error && (
          // 바코드를 맞출 가이드 상자
          <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-1/3 -translate-y-1/2 rounded-lg border-2 border-white/80" />
        )}
      </div>
      {error ? (
        <div className="w-full max-w-md rounded-xl bg-background p-3 text-foreground">
          <FormMessage error={error} />
        </div>
      ) : (
        <p className="text-center text-sm">책 뒷면의 바코드를 상자 안에 비춰 주세요.</p>
      )}
      <button type="button" onClick={onClose} autoFocus className={`${smallSecondaryButtonClass} bg-background text-foreground`}>
        닫기
      </button>
    </div>
  );
}
