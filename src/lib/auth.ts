import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { findUserByLogin } from "@/lib/find-user-by-login";
import { applyNormalizedAuthUrl } from "@/lib/auth-url";
import { googleClientId, googleClientSecret, googleConfigured } from "@/lib/google-oauth";
import {
  REGISTRATION_DEVICE_COOKIE,
  confirmRegistration,
  pendingMatchesLogin,
  safeCallbackUrl,
  startRegistration,
} from "@/lib/registration";
import { canonicalSiteOrigin } from "@/lib/auth-url";
import { cookies } from "next/headers";
import { sendWelcomeEmail } from "@/lib/client-emails";
import {
  ADVISOR_DEVICE_COOKIE,
  AdvisorLinkError,
  confirmAdvisorLink,
  notifyAdvisorLogin,
} from "@/lib/advisor-access";

/** קודי השגיאה שההתחברות מחזירה, ומתורגמים ב-auth-errors */
export const LoginError = {
  EmailNotVerified: "EmailNotVerified",
  GoogleEmailUnverified: "GoogleEmailUnverified",
  GoogleNotAllowed: "GoogleNotAllowed",
} as const;

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * היעד שהגולש ביקש לפני שיצא להתחבר עם גוגל (למשל המסלול שבחר בעמוד הבית),
 * מתוך עוגיית ה-callback של NextAuth — כדי שיחכה לו גם אחרי אישור המייל.
 */
async function pendingGoogleCallbackUrl(): Promise<string | null> {
  try {
    const jar = await cookies();
    const raw =
      jar.get("__Secure-next-auth.callback-url")?.value ?? jar.get("next-auth.callback-url")?.value;
    if (!raw) return null;
    const url = new URL(raw, "http://local");
    return safeCallbackUrl(`${url.pathname}${url.search}`);
  } catch {
    return null;
  }
}

/**
 * NEXTAUTH_URL מנורמל פעם אחת, בטעינת המודול: מרכאות עוטפות, רווח או סלאש
 * בסוף משנים את כתובת הבסיס — ואיתה את ה-Redirect URI שנשלח לגוגל, שאז אינו
 * זהה לזה שרשום ב-Google Cloud Console וגוגל עונה `redirect_uri_mismatch`.
 */
applyNormalizedAuthUrl();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            /**
             * קישור לפי מייל בטוח כאן: משתמש נוצר רק אחרי שהמייל שלו אומת
             * בקישור, וה-signIn שלמטה מקבל מגוגל רק מייל שגוגל אימתה.
             */
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) return null;
        const user = await findUserByLogin(identifier);
        const isValid = Boolean(user?.hashedPassword) && (await bcrypt.compare(password, user!.hashedPassword!));
        if (!user || !isValid) {
          // נרשמו אבל עוד לא אישרו את המייל — אומרים את זה רק למי שיודע את הסיסמה
          if (await pendingMatchesLogin(identifier, password)) {
            throw new Error(LoginError.EmailNotVerified);
          }
          return null;
        }
        // היועץ נכנס רק דרך הכניסה הנסתרת (advisor-link), לעולם לא בסיסמה
        if (user.role === "ADVISOR") return null;
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        } as any;
      },
    }),
    /**
     * אישור הקישור שנשלח במייל. זה הרגע היחיד שבו נוצר חשבון לקוח חדש, ומיד
     * אחריו הלקוח מחובר ונכנס לאזור האישי.
     */
    Credentials({
      id: "email-link",
      name: "Email verification link",
      credentials: {
        token: { label: "Token", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const user = await confirmRegistration({
          token: String(credentials?.token ?? ""),
          password: credentials?.password ? String(credentials.password) : null,
          deviceToken: readCookie(
            (req?.headers as Record<string, string> | undefined)?.cookie,
            REGISTRATION_DEVICE_COOKIE
          ),
        });
        // מייל ברוכים הבאים, עם הכתובת האישית. כשל בשליחה לא עוצר את הכניסה
        await sendWelcomeEmail(user.id);
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        } as any;
      },
    }),
    /**
     * הכניסה הנסתרת של היועץ: הקישור החד-פעמי שנשלח למייל היועץ, ורק מהדפדפן
     * שביקש אותו. ראו advisor-access.
     */
    Credentials({
      id: "advisor-link",
      name: "Advisor link",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials, req) {
        const headers = (req?.headers ?? {}) as Record<string, string | undefined>;
        try {
          const advisor = await confirmAdvisorLink(
            String(credentials?.token ?? ""),
            readCookie(headers.cookie, ADVISOR_DEVICE_COOKIE)
          );
          await notifyAdvisorLogin({
            ip: (headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() || "לא ידוע",
            userAgent: headers["user-agent"] ?? null,
          });
          return { ...advisor, email: advisor.email ?? undefined, advisorLink: true } as any;
        } catch (error) {
          if (error instanceof AdvisorLinkError) throw new Error(error.message);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * התחברות עם גוגל.
     *
     * גוגל חייבת להעיד שהמייל מאומת. חשבון גוגל שכבר מקושר, או מייל שכבר
     * רשום אצלנו, נכנס כרגיל. מייל חדש לא הופך למשתמש: נפתחת הרשמה ממתינה,
     * נשלח קישור אימות, והגולש מועבר למסך "בדקו את המייל".
     */
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      const email = (profile?.email ?? "").trim().toLowerCase();
      const googleVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified === true;
      if (!email || !googleVerified) {
        return `/auth/login?error=${LoginError.GoogleEmailUnverified}`;
      }

      const linked = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
        },
        select: { user: { select: { role: true } } },
      });
      if (linked) {
        // חשבון היועץ לא נפתח עם גוגל — רק בכניסה הנסתרת
        if (linked.user.role === "ADVISOR") return `/auth/login?error=${LoginError.GoogleNotAllowed}`;
        return true;
      }

      const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          role: true,
          emailVerified: true,
          hashedPassword: true,
          accounts: { select: { id: true } },
        },
      });
      // חשבון היועץ לא נפתח עם גוגל — רק בכניסה הנסתרת
      if (existing?.role === "ADVISOR") return `/auth/login?error=${LoginError.GoogleNotAllowed}`;
      if (existing) {
        /**
         * חשבון ישן עם סיסמה שהמייל שלו מעולם לא אומת, ובלי שום חשבון מקושר:
         * ייתכן שמישהו אחר פתח אותו עם המייל הזה ובחר את הסיסמה. גוגל מוכיחה
         * עכשיו מי בעל המייל, ולכן הסיסמה הלא-מאומתת נמחקת לפני הקישור.
         */
        if (!existing.emailVerified && existing.hashedPassword && existing.accounts.length === 0) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { hashedPassword: null, emailVerified: new Date() },
          });
        }
        return true;
      }

      const result = await startRegistration({
        email,
        name: profile?.name ?? null,
        image: (profile as { picture?: string } | undefined)?.picture ?? null,
        provider: "google",
        providerAccountId: account.providerAccountId,
        callbackUrl: await pendingGoogleCallbackUrl(),
        requestOrigin: canonicalSiteOrigin(),
      });
      const params = new URLSearchParams({ via: "google", email });
      if (result.status === "email-failed") params.set("error", "send");
      return `/auth/check-email?${params.toString()}`;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.advisorLink = (user as any).advisorLink === true;
        const existingRole = (user as any).role;
        if (existingRole) {
          token.role = existingRole;
        } else if (token.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: String(token.id) },
            select: { role: true },
          });
          token.role = dbUser?.role ?? "CLIENT";
        } else {
          token.role = "CLIENT";
        }
      }
      /**
       * התחברות של יועץ שלא עברה בכניסה הנסתרת — למשל של יועץ שנמחק, או
       * מלפני שהכניסה בסיסמה בוטלה — אינה תקפה יותר.
       */
      if (token.role === "ADVISOR" && token.advisorLink !== true) {
        delete token.id;
        delete token.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
};

export function getServerAuth() {
  return getServerSession(authOptions);
}