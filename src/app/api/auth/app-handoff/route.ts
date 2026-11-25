import { NextResponse } from 'next/server';
import { getServerAuth } from '@/lib/auth';
import { isValidChallenge, issueAppHandoff } from '@/lib/app-handoff';
import { safeCallbackUrl } from '@/lib/registration';
import { APP_AUTH_CALLBACK } from '@/lib/native-app/constants';

export const dynamic = 'force-dynamic';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * עמוד קטן בדפדפן של המערכת שמחזיר לאפליקציה. מעבר אוטומטי לקישור של
 * האפליקציה, ולצידו כפתור — יש דפדפנים שמעבירים לאפליקציה רק אחרי לחיצה.
 */
function bouncePage(appUrl: string, webUrl: string, message: string): NextResponse {
  const app = escapeHtml(appUrl);
  const web = escapeHtml(webUrl);
  const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>משכלנתא</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #f8fafc; font-family: Assistant, system-ui, -apple-system, sans-serif; color: #0f172a; }
  .card { background: #fff; border-radius: 16px; box-shadow: 0 10px 30px rgba(15,23,42,.08);
    padding: 28px 24px; margin: 16px; max-width: 360px; text-align: center; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #475569; margin: 0 0 20px; line-height: 1.5; }
  a.button { display: block; background: #2563eb; color: #fff; text-decoration: none; font-weight: 600;
    border-radius: 10px; padding: 12px 16px; }
  a.web { display: inline-block; margin-top: 14px; color: #475569; font-size: 14px; }
</style>
</head>
<body>
<div class="card">
  <h1>${escapeHtml(message)}</h1>
  <p>חוזרים לאפליקציית משכלנתא.</p>
  <a class="button" href="${app}">חזרה לאפליקציה</a>
  <a class="web" href="${web}">להמשיך כאן בדפדפן</a>
</div>
<script>window.location.replace(${JSON.stringify(appUrl)});</script>
</body>
</html>`;
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

/**
 * היעד של הכניסה עם Google שהאפליקציה פתחה בדפדפן (ראו src/lib/app-handoff.ts):
 * מנפיק קוד חד-פעמי למשתמש שהתחבר, ומחזיר אותו לאפליקציה.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const next = safeCallbackUrl(params.get('next')) ?? '/dashboard';
  const challenge = params.get('challenge');

  const session = await getServerAuth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id || user.role === 'ADVISOR' || !isValidChallenge(challenge)) {
    const back = new URL(APP_AUTH_CALLBACK);
    back.searchParams.set('error', 'signin');
    return bouncePage(back.toString(), '/auth/login', 'ההתחברות לא הושלמה');
  }

  const code = await issueAppHandoff(user.id, challenge);
  const back = new URL(APP_AUTH_CALLBACK);
  back.searchParams.set('code', code);
  back.searchParams.set('next', next);
  return bouncePage(back.toString(), next, 'התחברתם בהצלחה');
}
