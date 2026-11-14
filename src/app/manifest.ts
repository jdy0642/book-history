import type { MetadataRoute } from "next";
import { APP_NAME, BRAND } from "@/lib/brand";

/** 홈 화면에 설치했을 때의 앱 정보 (/manifest.webmanifest) */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    description: "아이에게 읽어준 책을 10초 만에 기록해요.",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND.background,
    theme_color: BRAND.accent,
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "책 읽었어요", short_name: "기록하기", url: "/log/new" }],
  };
}
