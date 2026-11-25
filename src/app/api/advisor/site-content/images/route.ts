import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/platform-admin';
import { storeUploadedImage } from '@/lib/site-image-upload';

/** העלאת תמונה לבאנר. הגוף הוא התמונה עצמה; התשובה — הכתובת הציבורית שלה */
export async function POST(req: NextRequest) {
  // באנרים של האתר כולו — מנהל הפלטפורמה בלבד. ללוגו ולתמונה של המשרד: /api/advisor/office/images
  const auth = await requirePlatformAdmin();
  if (auth instanceof NextResponse) return auth;
  return storeUploadedImage(req, auth.advisorId);
}
