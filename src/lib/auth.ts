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

/** קודי השגיאה שההתחברות מחזירה, ומתורגמים ב-auth-errors */
export const LoginError = {
  EmailNotVerified: "EmailNotVerified",
  NotAdvisor: "NotAdvisor",
  GoogleEmailUnverified: "GoogleEmailUnverified",
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
        /** "advisor" — הכניסה בתחתית מסך ההתחברות, ליועצים שכבר רשומים בלבד */
        portal: { label: "Portal", type: "text" },
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
        // הכניסה ליועצים לא פותחת שום חשבון שאינו חשבון יועץ
        if (credentials?.portal === "advisor" && user.role !== "ADVISOR") {
          throw new Error(LoginError.NotAdvisor);
        }
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
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        } as any;
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
        select: { id: true },
      });
      if (linked) return true;

      const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, emailVerified: true, hashedPassword: true, accounts: { select: { id: true } } },
      });
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
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      const base = user.email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .slice(0, 24);
      if (!base) return;
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { username: base },
        });
      } catch {
        // שם המשתמש כבר תפוס — נשאר בלי username
      }
    },
  },
};

export function getServerAuth() {
  return getServerSession(authOptions);
}