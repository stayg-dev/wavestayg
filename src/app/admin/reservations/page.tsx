import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { WebsiteBookingAdmin } from "@/components/website-booking-admin";
import "../../booking-portal.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "예약 및 수분양자 관리",
  robots: { index: false, follow: false },
};
export default async function Page() {
  if (!(await isAdmin())) redirect("/admin/");
  return <WebsiteBookingAdmin />;
}
