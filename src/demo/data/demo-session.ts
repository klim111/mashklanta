/**
 * הפרסונה וה-session של ההדגמה — קובץ קל במיוחד, בלי תלויות.
 *
 * ספקי השורש של האתר קוראים ממנו בכל דף, ולכן הוא לא מייבא דבר מהמנוע או
 * ממחשבוני המשכנתא. כל שאר נתוני ההדגמה נמצאים ב-demo-data.
 */

export const DEMO_PERSONA = {
  id: 'demo-user',
  name: 'דנה ואורי לוי',
  firstName: 'דנה',
  email: 'demo@mashkalanta.example',
  username: 'demo',
  role: 'CLIENT' as const,
  advisorName: 'יועץ משכלנתא',
};

/** ה-session המדומה — מה ש-`useSession` מחזיר בזמן ההדגמה */
export function demoSession() {
  const expires = new Date();
  expires.setDate(expires.getDate() + 1);
  return {
    user: {
      id: DEMO_PERSONA.id,
      name: DEMO_PERSONA.name,
      email: DEMO_PERSONA.email,
      role: DEMO_PERSONA.role,
      image: null,
    },
    expires: expires.toISOString(),
  };
}
