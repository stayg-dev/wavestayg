import { PaymentResult } from '@/components/payment-result';
import { paymentUuid } from '@/lib/payment-return';
import { redirect } from 'next/navigation';
import '../../booking-portal.css';
export const metadata = { title: '결제 결과', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function Page({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams; if (!order || !paymentUuid.test(order)) redirect('/reservation/lookup/');
  return <PaymentResult orderId={order} />;
}
