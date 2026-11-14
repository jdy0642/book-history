import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 15 는 동적 페이지의 메타데이터(매니페스트·아이콘 링크 등)를 스트리밍으로 <body> 에 넣는다.
  // 그러면 Chrome 이 매니페스트를 놓쳐 "설치 가능한 앱"으로 인식하지 못하고, iPhone 도 홈 화면 아이콘을 못 찾을 수 있다.
  // 모든 요청에서 <head> 에 넣도록 한다. 메타데이터가 모두 고정 값이라 스트리밍을 꺼도 느려지지 않는다.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
