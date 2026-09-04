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
        if (!user?.hashedPassword) return null;
        const isValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isValid) return null;
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