import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
export const runtime = 'nodejs';

function decrypt(encStr: string) {
  const key = crypto.createHash('sha256').update(process.env.PAYSTACK_SECRET_KEY!).digest();
  const [ivHex, tagHex, enc] = encStr.split(':');
  const d = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  d.setAuthTag(Buffer.from(tagHex, 'hex'));
  let dec = d.update(enc, 'hex', 'utf8');
  dec += d.final('utf8');
  return dec;
}

export async function GET(req: NextRequest) {
  const c = req.cookies.get('pending_key_delivery')?.value;
  if (!c) return NextResponse.json({ success: false, error: 'No key' }, { status: 404 });
  try {
    const fullKey = decrypt(c);
    const res = NextResponse.json({ success: true, api_key: fullKey });
    res.cookies.delete('pending_key_delivery');
    return res;
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}