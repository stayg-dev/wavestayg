import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/admin-auth';
import { PaymentAdmin } from '@/components/payment-admin';
import '../../booking-portal.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: '온라인 결제·환불 관리', robots: { index: false, follow: false } };
export default async function Page() { if (!(await isAdmin())) redirect('/admin/'); return <PaymentAdmin />; }
