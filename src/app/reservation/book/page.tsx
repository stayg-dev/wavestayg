import { GeneralBookingPortal } from "@/components/website-booking";
import "../../booking-portal.css";
import { validISO } from '@/lib/booking';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const text = (key: string) => typeof p[key] === 'string' ? p[key] as string : '';
  const date = (key: string) => validISO(text(key)) ? text(key) : '';
  const adults = Number(text('adults'));
  return <GeneralBookingPortal initial={{ check_in: date('check_in'), check_out: date('check_out'), adults: Number.isInteger(adults) && adults >= 1 && adults <= 4 ? adults : 2, room_type: text('room_type').slice(0,120) }} />;
}
