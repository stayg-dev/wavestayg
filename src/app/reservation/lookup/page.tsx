import { ReservationLookup } from "@/components/general-reservation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  const lookupId =
    typeof id === "string" &&
    /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]{2,10}\d{8,16})$/i.test(id)
      ? id
      : "";
  return <ReservationLookup lookupId={lookupId} />;
}
