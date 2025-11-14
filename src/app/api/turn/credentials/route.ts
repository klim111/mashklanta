import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Logging utility
const log = (level: 'info' | 'warn' | 'error', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [TURN Credentials API] [${level.toUpperCase()}] ${message}${logData}`);
};

// Generates TURN REST (time-limited) credentials compatible with coturn use-auth-secret
// Env required (server-side only):
// - TURN_REALM=mashklanta.com
// - TURN_STATIC_AUTH_SECRET=your_shared_secret (must match TURN server)
// - TURN_URL=turn:mashklanta.com:3478 (comma-separated allowed)
// - TURN_TTL_SECONDS=86400 (optional, default 24 hours)
// - TURN_FORCE_RELAY=true|false (optional)

export async function GET(req: NextRequest) {
  try {
    const realm = process.env.TURN_REALM || 'mashklanta.com';
    const secret = process.env.TURN_STATIC_AUTH_SECRET;
    const urlList = (process.env.TURN_URL || '').split(',').map(s => s.trim()).filter(Boolean);
    const forceRelay = (process.env.TURN_FORCE_RELAY || '').toLowerCase() === 'true';

    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    log('info', `TURN credentials request`, { 
      realm, 
      hasSecret: !!secret, 
      urlCount: urlList.length, 
      forceRelay,
      clientIp 
    });

    if (!secret || urlList.length === 0) {
      log('error', `TURN server not configured`, { 
        hasSecret: !!secret, 
        urlCount: urlList.length,
        realm,
        urls: urlList 
      });
      return NextResponse.json({ error: 'TURN server not configured' }, { status: 500 });
    }

    // Username as expiry timestamp (epoch seconds) – 24h validity by default
    const ttlSeconds = parseInt(process.env.TURN_TTL_SECONDS || '86400', 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const username = (currentTimestamp + ttlSeconds).toString();

    // HMAC-SHA1 over username with shared secret
    // At this point, secret is guaranteed to be defined (checked above)
    const hmac = crypto.createHmac('sha1', secret as string);
    hmac.update(username);
    const credential = hmac.digest('base64');

    const response = {
      realm,
      urls: urlList.length === 1 ? urlList[0] : urlList,
      username,
      credential,
      forceRelay,
    };

    log('info', `TURN credentials generated`, { 
      realm,
      urlCount: urlList.length,
      username,
      credentialLength: credential.length,
      expiresAt: new Date((currentTimestamp + ttlSeconds) * 1000).toISOString(),
      ttlSeconds,
      forceRelay
    });

    return NextResponse.json(response);
  } catch (err: any) {
    log('error', `Failed to generate TURN credentials`, { 
      error: err?.message || String(err),
      stack: err?.stack 
    });
    return NextResponse.json({ error: err?.message || 'Failed to generate TURN credentials' }, { status: 500 });
  }
}


