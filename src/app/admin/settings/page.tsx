import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { WebsiteSalesSettings } from "@/components/website-sales-settings";
import "../../booking-portal.css";
import "./settings.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "홈페이지 요금·판매 설정",
  robots: { index: false, follow: false },
};
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin/");
  return <WebsiteSalesSettings />;
}
