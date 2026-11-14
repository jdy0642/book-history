import type { Metadata, Viewport } from "next";
import { APP_NAME, BRAND } from "@/lib/brand";
import "./globals.css";

/**
 * 안드로이드 Chrome 은 "설치할 수 있음"(beforeinstallprompt) 이벤트를 페이지를 처음 열 때 한 번만 보낸다.
 * 설치 버튼은 가족 관리 화면에 있으므로, 어느 화면에서 시작하든 놓치지 않게 앱이 뜨자마자 받아 둔다.
 * (React 가 붙기 전에 올 수도 있어서 컴포넌트가 아니라 인라인 스크립트로)
 */
const CAPTURE_INSTALL_PROMPT = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__installPrompt=e;window.dispatchEvent(new Event("installprompt"))});`;

export const metadata: Metadata = {
  title: { template: `%s · ${APP_NAME}`, default: APP_NAME },
  description: "아이에게 읽어준 책을 기록하는 앱",
  applicationName: APP_NAME,
  // iPhone 에서 "홈 화면에 추가"로 열면 주소창 없이 앱처럼
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND.accent,
  viewportFit: "cover", // 노치·홈 인디케이터 영역까지 (아래 탭 바가 safe-area 여백을 직접 둔다)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CAPTURE_INSTALL_PROMPT }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
