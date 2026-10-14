import { cookies } from 'next/headers';
import { apiError, jsonResponse, readJson, sameOrigin } from '@/lib/api';
import { pms } from '@/lib/pms';
import { HttpError } from '@/lib/http-error';
import { parsePaymentReturn, paymentUuid } from '@/lib/payment-return';
export const runtime = 'nodejs';
type Context = { params: Promise<{ path: string[] }> };
type PaymentSession = { order_id: string; status_token: string };
async function saveSession(session: PaymentSession) {
  if (!paymentUuid.test(session.order_id) || !/^[\w-]{43}$/.test(session.status_token)) throw new HttpError(503, '결제 응답을 확인해 주세요.');
  (await cookies()).set(`wave_payment_${session.order_id}`, session.status_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/payments/', maxAge: 86400 });
}
async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  try {
    if (request.method === 'POST' && path.length === 1 && path[0] === 'return') {
      const url = new URL(request.url), id = url.searchParams.get('order') ?? '', token = url.searchParams.get('token') ?? '';
      if (!paymentUuid.test(id) || !/^[\w-]{43}$/.test(token) || url.searchParams.getAll('order').length !== 1 || url.searchParams.getAll('token').length !== 1) throw new HttpError(400, '결제 요청 정보가 없습니다.');
      if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/x-www-form-urlencoded')) throw new HttpError(415, '결제 응답 형식이 다릅니다.');
      const reader = request.body?.getReader(); if (!reader) throw new HttpError(400, '결제 응답이 없습니다.');
      const chunks: Uint8Array[] = []; let size = 0;
      try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 32000) { await reader.cancel(); throw new HttpError(413, '결제 응답이 너무 큽니다.'); } chunks.push(part.value); } } finally { reader.releaseLock(); }
      const session = await pms<PaymentSession>(`payments/${id}/authenticate`, 'POST', { token, fields: parsePaymentReturn(Buffer.concat(chunks)) });
      await saveSession(session);
      return new Response(null, { status: 303, headers: { Location: `/reservation/payment/?order=${session.order_id}`, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    if (request.method === 'GET' && path.join('/') === 'config') return jsonResponse(await pms('payments/config'));
    if (request.method === 'GET' && path.length === 2 && path[1] === 'status' && paymentUuid.test(path[0])) {
      const token = (await cookies()).get(`wave_payment_${path[0]}`)?.value;
      if (!token) throw new HttpError(401, '예약 조회에서 신청 번호와 비밀번호를 입력해 주세요.');
      return jsonResponse(await pms(`payments/${path[0]}/status`, 'POST', { token }));
    }
    if (request.method !== 'POST' || path.length !== 1 || !['prepare', 'lookup'].includes(path[0])) throw new HttpError(404, '잘못된 경로입니다.');
    sameOrigin(request);
    const body = await readJson(request, 12000);
    if (path[0] === 'prepare') {
      if (body.terms !== true || body.payment_terms !== true) throw new HttpError(400, '개인정보와 결제·취소 규정에 동의해 주세요.');
      delete body.terms; delete body.payment_terms;
      body.quoted_amount = 0; body.guest_count = Number(body.adults) + Number(body.children);
    }
    const session = await pms<PaymentSession & Record<string, unknown>>(`payments/${path[0]}`, 'POST', body);
    await saveSession(session);
    const safe: Record<string, unknown> = { ...session }; delete safe.status_token;
    return jsonResponse(safe);
  } catch (error) {
    if (path[0] === 'return') return new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>결제 확인</title><main><h1>결제 결과를 확인해 주세요</h1><p>응답을 확인하지 못했습니다. 다시 결제하기 전에 예약 조회에서 상태를 확인해 주세요.</p><a href="/reservation/lookup/">예약 조회</a></main></html>', { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' } });
    return apiError(error);
  }
}
export const GET = handle;
export const POST = handle;
