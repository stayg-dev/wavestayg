import type { Metadata } from "next";
import "./globals.css";
import "./pages.css";
import "./design-update.css";
import "./rates.css";
import "./photos.css";
export const metadata: Metadata = {
  title: { default: "WAVE STAY-G · 양양", template: "%s | WAVE STAY-G" },
  description: "양양 죽도해변, 파도 소리와 함께 시작하는 편안한 스테이.",
  icons: { icon: "/assets/logo-color.png" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <a href="#main" className="skip-link">
          본문으로 이동
        </a>
        {children}
      </body>
    </html>
  );
}
