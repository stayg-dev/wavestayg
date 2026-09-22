import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { NoticeAdmin } from "@/components/notice-admin";
import "../admin.css";

export const metadata: Metadata = {
  title: "공지사항 관리",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function NoticesPage() {
  if (!(await isAdmin())) redirect("/admin/");
  return (
    <main id="main" className="admin-page">
      <header className="admin-header">
        <Link href="/">WAVE STAY-G <span>양양</span></Link>
      </header>
      <NoticeAdmin initialAuthenticated />
    </main>
  );
}
