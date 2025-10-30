import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Generates TURN REST (time-limited) credentials compatible with coturn use-auth-secret
// Env required (server-side only):
// - TURN_REALM=mashklanta.com
// - TURN_STATIC_AUTH_SECRET=your_shared_secret
// - TURN_URL=turn:mashklanta.com:3478 (comma-separated allowed)
// - TURN_FORCE_RELAY=true|false (optional)

export async function GET(_req: NextRequest) {
  try {
    const realm = process.env.TURN_REALM || 'mashklanta.com';
    const secret = process.env.TURN_STATIC_AUTH_SECRET;
    const urlList = (process.env.TURN_URL || '').split(',').map(s => s.trim()).filter(Boolean);
    const forceRelay = (process.env.TURN_FORCE_RELAY || '').toLowerCase() === 'true';

    if (!secret || urlList.length === 0) {
      return NextResponse.json({ error: 'TURN server not configured' }, { status: 500 });
    }

    // Username as expiry timestamp (epoch seconds) – 24h validity by default
    const ttlSeconds = parseInt(process.env.TURN_TTL_SECONDS || '86400', 10);
    const username = Math.floor(Date.now() / 1000) + ttlSeconds + '';

    // HMAC-SHA1 over username with shared secret
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    return NextResponse.json({
      realm,
      urls: urlList.length === 1 ? urlList[0] : urlList,
      username,
      credential,
      forceRelay,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to generate TURN credentials' }, { status: 500 });
  }
}


