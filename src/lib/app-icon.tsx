import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

/**
 * 앱 아이콘: 주황 바탕에 펼친 책.
 * 글꼴 없이 도형만으로 그린다 (한글·이모지 글꼴을 내려받지 않아도 되게).
 * safeZone: 그림이 차지하는 비율. 마스커블 아이콘은 안드로이드가 가장자리를 잘라내므로 더 작게.
 */
export function renderAppIcon(size: number, { safeZone = 0.62, rounded = false } = {}) {
  const book = size * safeZone;
  const page = book / 2;
  const big = size * 0.05; // 책 바깥쪽 모서리
  const small = size * 0.015; // 가운데(접히는 쪽) 모서리

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.accent,
          borderRadius: rounded ? size * 0.22 : 0,
        }}
      >
        <div style={{ display: "flex", gap: page * 0.08, transform: "translateY(4%)" }}>
          {/* 왼쪽·오른쪽 페이지: 바깥쪽 모서리만 크게 둥글게 */}
          {[
            [big, small],
            [small, big],
          ].map(([left, right], i) => (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                width: page * 0.96,
                height: book * 0.78,
                background: "white",
                borderRadius: `${left}px ${right}px ${right}px ${left}px`,
              }}
            >
              {[0.16, 0.3, 0.44].map((top) => (
                <div
                  key={top}
                  style={{
                    position: "absolute",
                    top: book * top,
                    left: page * 0.18,
                    width: page * 0.64,
                    height: Math.max(2, size * 0.022),
                    borderRadius: size,
                    background: BRAND.accentSoft,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
