import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminConfig, isAdmin } from "@/lib/admin-auth";
import { pmsConfigured } from "@/lib/pms";
import { NoticeAdmin } from "@/components/notice-admin";
import "./admin.css";

export const metadata: Metadata = {
  title: "관리자",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  let configured = pmsConfigured();
  try {
    await adminConfig();
  } catch {
    configured = false;
  }
  if (configured && await isAdmin()) redirect("/admin/reservations/");
  return (
    <main id="main" className="admin-page">
      <header className="admin-header">
        <Link href="/">
          WAVE STAY-G <span>양양</span>
        </Link>
      </header>
      {configured ? (
        <NoticeAdmin initialAuthenticated={false} />
      ) : (
        <section className="admin-login">
          <p className="admin-eyebrow">NOTICE ADMIN</p>
          <h1>관리자 설정이 필요합니다</h1>
          <p>
            사업장 설정을 확인해 주세요.
          </p>
          <p>
            설정 후 다시 접속해 주세요.
          </p>
        </section>
      )}
    </main>
  );
}
