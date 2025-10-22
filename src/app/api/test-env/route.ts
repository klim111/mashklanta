import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    openaiKeyExists: !!process.env.OPENAI_API_KEY,
    openaiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
    openaiModel: process.env.OPENAI_MODEL,
    nodeEnv: process.env.NODE_ENV,
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
  });
}

