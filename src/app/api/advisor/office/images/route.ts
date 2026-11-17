import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisor } from '@/lib/platform-admin';
import { storeUploadedImage } from '@/lib/site-image-upload';

/** הלוגו או התמונה של המשרד. הגוף הוא התמונה עצמה; התשובה — הכתובת הציבורית שלה */
export async function POST(req: NextRequest) {
  const auth = await requireAdvisor();
  if (auth instanceof NextResponse) return auth;
  return storeUploadedImage(req, auth.advisorId);
}
