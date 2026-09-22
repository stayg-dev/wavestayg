import { OwnerPortal } from "@/components/website-booking";
import "../booking-portal.css";
export const metadata = {
  title: "수분양자 예약",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <OwnerPortal />;
}
