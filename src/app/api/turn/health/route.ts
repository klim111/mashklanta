import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// TURN server health check endpoint
// Validates TURN server configuration and connectivity
export async function GET(_req: NextRequest) {
  try {
    const realm = process.env.TURN_REALM || 'mashklanta.com';
    const secret = process.env.TURN_STATIC_AUTH_SECRET;
    const urlList = (process.env.TURN_URL || '').split(',').map(s => s.trim()).filter(Boolean);
    const ttlSeconds = parseInt(process.env.TURN_TTL_SECONDS || '86400', 10);

    // Check configuration
    const configStatus = {
      realm: !!realm,
      secret: !!secret,
      urls: urlList.length > 0,
      allConfigured: !!(realm && secret && urlList.length > 0)
    };

    if (!configStatus.allConfigured || !secret) {
      return NextResponse.json({
        status: 'error',
        message: 'TURN server not fully configured',
        config: configStatus,
        required: {
          realm: 'TURN_REALM',
          secret: 'TURN_STATIC_AUTH_SECRET',
          urls: 'TURN_URL'
        }
      }, { status: 500 });
    }

    // Validate credential generation works
    // At this point, secret is guaranteed to be defined
    const username = Math.floor(Date.now() / 1000) + ttlSeconds + '';
    const hmac = crypto.createHmac('sha1', secret);
    hmac.update(username);
    const credential = hmac.digest('base64');

    // Test credential generation
    const credentialTest = {
      username,
      credential,
      expiry: new Date(parseInt(username) * 1000).toISOString(),
      valid: true
    };

    // Attempt to test TURN server connectivity (non-blocking)
    // Note: Actual TURN connectivity test would require UDP/TCP socket connection
    // This is a configuration validation check only
    const connectivityStatus = {
      configured: true,
      note: 'Actual connectivity test requires network access. This validates configuration only.'
    };

    return NextResponse.json({
      status: 'ok',
      config: configStatus,
      credentialTest,
      connectivityStatus,
      urls: urlList,
      realm,
      ttl: ttlSeconds
    }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      error: err?.message || 'Failed to validate TURN configuration'
    }, { status: 500 });
  }
}

