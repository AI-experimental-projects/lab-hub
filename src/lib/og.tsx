import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

// Share card in the site's dark theme (colors mirror globals.css).
export function ogCard({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#111317",
          color: "#c8ccd3",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, color: "#e1e4e9" }}>
          lab<span style={{ color: "#8fb3a8" }}>/</span>hub
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 28, color: "#8fb3a8" }}>{eyebrow}</div>
          <div style={{ fontSize: 72, color: "#e1e4e9", lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 34, color: "#858c97", lineHeight: 1.35 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#858c97" }}>lab.beaiapp.com</div>
      </div>
    ),
    OG_SIZE,
  );
}
