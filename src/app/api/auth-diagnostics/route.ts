import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { googleOAuthStatus } from "@/lib/google-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * מצב ההתחברות עם גוגל, כפי שהשרת רואה אותו בבקשה הזו.
 *
 * המסך של גוגל (`Error 400: redirect_uri_mismatch`) לא מחזיר את הגולש לאתר,
 * ולכן אין דרך להציג את הסיבה בתוך זרימת ההתחברות. הנתונים כאן מאפשרים גם
 * לכפתור ההתחברות להעביר את הגולש לכתובת הנכונה, וגם למי שמגדיר את השרת
 * להעתיק את ה-Redirect URI המדויק ל-Google Cloud Console.
 *
 * אין כאן סוד: ה-Redirect URI וה-Client ID גלויים ממילא בכתובת שנשלחת לגוגל.
 * ה-Client Secret אינו נחשף — רק העובדה שהוא מוגדר.
 */
export async function GET() {
  const status = googleOAuthStatus(await headers());

  return NextResponse.json(
    {
      ...status,
      hint: status.configured
        ? status.originMatches
          ? "ההגדרה תקינה. אם גוגל עדיין מחזירה redirect_uri_mismatch, ודאו שה-URI שלמטה רשום ב-Google Cloud Console → Credentials → OAuth client → Authorized redirect URIs, בדיוק כפי שהוא."
          : "הכתובת שממנה נטען האתר שונה מהכתובת הרשמית שלו, ולכן גוגל תדחה את ההתחברות. התחברו דרך הכתובת הרשמית, או רשמו גם את ה-URI של הכתובת הנוכחית ב-Google Cloud Console."
        : "התחברות עם Google לא מוגדרת בסביבה הזו: חסרים GOOGLE_CLIENT_ID או GOOGLE_CLIENT_SECRET.",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
