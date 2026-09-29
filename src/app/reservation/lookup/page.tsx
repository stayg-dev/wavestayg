import { GeneralBookingPortal } from "@/components/website-booking";
import "../../booking-portal.css";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  const lookupId =
    typeof id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ? id
      : "";
  return <GeneralBookingPortal lookup lookupId={lookupId} />;
}
