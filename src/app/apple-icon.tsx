import { renderAppIcon } from "@/lib/app-icon";

// iPhone "홈 화면에 추가" 아이콘 (iOS 가 직접 모서리를 둥글게 깎으므로 사각형으로)
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return renderAppIcon(180);
}
