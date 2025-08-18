import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import crypto from "crypto";

// Generate a fallback secret if NEXTAUTH_SECRET is not set
const generateFallbackSecret = () => {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }
  
  // In production, we should always have a secret set
  if (process.env.NODE_ENV === "production") {
    console.error("⚠️  NEXTAUTH_SECRET is not set in production! Please set this environment variable.");
    throw new Error("NEXTAUTH_SECRET is required in production");
  }
  
  // In development, generate a temporary secret
  console.warn("⚠️  NEXTAUTH_SECRET not found, generating temporary secret for development");
  return crypto.randomBytes(32).toString("base64");
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: generateFallbackSecret(),
  debug: process.env.NODE_ENV === "development",
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;
          if (!email || !password) return null;
          
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.hashedPassword) return null;
          
          const isValid = await bcrypt.compare(password, user.hashedPassword);
          if (!isValid) return null;
          
          return { 
            id: user.id, 
            email: user.email ?? undefined, 
            name: user.name ?? undefined, 
            image: user.image ?? undefined 
          } as any;
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
  },
};

export function getServerAuth() {
  return getServerSession(authOptions);
}