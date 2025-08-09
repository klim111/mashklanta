import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      db: !!process.env.DATABASE_URL,
      s3: !!process.env.S3_BUCKET && !!process.env.S3_REGION,
      redis: !!process.env.REDIS_URL,
      boi: !!process.env.BOI_RATES_URL,
      authSecret: !!process.env.NEXTAUTH_SECRET,
    },
    time: new Date().toISOString(),
  });
}