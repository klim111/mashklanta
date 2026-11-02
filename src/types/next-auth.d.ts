import NextAuth, { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      /**
       * היועץ שעובד עכשיו בשם הלקוח, בתיק לקוח מתעניין (src/lib/act-as.ts).
       * קיים רק בחלון של התיק, ולא אצל הלקוח עצמו
       */
      actingAdvisorId?: string;
    } & DefaultSession["user"];
  }
  interface User {
    id: string;
    hashedPassword?: string | null;
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: string;
  }
}