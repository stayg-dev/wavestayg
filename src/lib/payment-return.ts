import { HttpError } from './http-error.ts';
export const paymentUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const authFields = new Set(['AuthResultCode', 'AuthToken', 'MID', 'Moid', 'Amt', 'PayMethod', 'Signature', 'TxTid', 'NextAppURL', 'NetCancelURL']);
/** Protocol fields are ASCII in both EUC-KR and UTF-8; buyer/message text is intentionally discarded. */
export function parsePaymentReturn(raw: Uint8Array) {
  if (raw.byteLength > 32000) throw new HttpError(413, '결제 응답이 너무 큽니다.');
  const result: Record<string, string> = {}, seen = new Set<string>();
  const text = Buffer.from(raw).toString('latin1');
  for (const entry of text.split('&')) {
    const index = entry.indexOf('=');
    const key = entry.slice(0, index < 0 ? entry.length : index);
    if (!authFields.has(key)) continue;
    if (seen.has(key)) throw new HttpError(400, '중복된 결제 응답입니다.');
    seen.add(key);
    const value = entry.slice(index < 0 ? entry.length : index + 1).replace(/\+/g, ' ');
    if (/%(?![0-9a-f]{2})/i.test(value)) throw new HttpError(400, '결제 응답을 확인해 주세요.');
    const decoded = value.replace(/%([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
    if (!/^[\x20-\x7e]*$/.test(decoded) || decoded.length > 4096) throw new HttpError(400, '결제 응답을 확인해 주세요.');
    result[key] = decoded;
  }
  if (!/^\d{4}$/.test(result.AuthResultCode ?? '')) throw new HttpError(400, '인증 결과가 없습니다.');
  return result;
}
