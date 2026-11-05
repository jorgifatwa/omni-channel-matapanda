import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getAuthSecret } from "@/lib/auth-secret";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

// Ensure NEXTAUTH_URL in serverless environment has valid scheme if set
if (process.env.VERCEL === "1" || process.env.NODE_ENV === "production") {
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith("http")) {
    process.env.NEXTAUTH_URL = `https://${process.env.NEXTAUTH_URL}`;
  } else if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  pages: {
    signIn: "/account/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email / Phone & Password",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }
        // Brute-force protection: per account and per IP
        const fwd = (req?.headers as Record<string, string | undefined> | undefined)?.["x-forwarded-for"];
        const ip = (fwd || "unknown").split(",")[0].trim();
        if (
          !(await rateLimit("login-id", credentials.identifier.trim().toLowerCase(), 10, 900)) ||
          !(await rateLimit("login-ip", ip, 30, 900))
        ) {
          throw new Error("Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.");
        }

        const identifier = credentials.identifier.trim();
        const inputPassword = credentials.password;
        const cleanPassword = inputPassword.trim();
        const isEmail = identifier.includes("@");
        const lowerIdentifier = identifier.toLowerCase();

        // 1. Database users (admins and customers), verified with bcrypt
        let dbReachable = true;
        let dbUserExists = false;
        try {
          const dbUser = await prisma.user.findFirst({
            where: {
              isActive: true,
              deletedAt: null,
              OR: isEmail
                ? [{ email: { equals: lowerIdentifier, mode: "insensitive" } }]
                : [
                    { phone: identifier },
                    { email: { equals: lowerIdentifier, mode: "insensitive" } },
                  ],
            },
          });

          if (dbUser && dbUser.passwordHash) {
            dbUserExists = true;
            const valid =
              (await bcrypt.compare(inputPassword, dbUser.passwordHash)) ||
              (await bcrypt.compare(cleanPassword, dbUser.passwordHash));
            if (valid) {
              return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
              };
            }
          }
          // A deactivated / deleted account still "exists": the env bootstrap
          // below must never bring it back.
          if (!dbUserExists) {
            const anyUser = await prisma.user.findFirst({
              where: { email: { equals: lowerIdentifier, mode: "insensitive" } },
              select: { passwordHash: true },
            });
            if (anyUser?.passwordHash) dbUserExists = true;
          }
        } catch (dbErr) {
          dbReachable = false;
          console.warn("[Auth] Database check error:", dbErr);
        }

        // 2. Bootstrap admin from ADMIN_DEFAULT_EMAIL / ADMIN_DEFAULT_PASSWORD.
        //    Only works when BOTH env vars are set and the account does not yet
        //    exist in the database (or the database is unreachable). Once the
        //    admin exists, only the password stored in the database is accepted.
        const envAdminEmail = (process.env.ADMIN_DEFAULT_EMAIL || "").trim().toLowerCase();
        const envAdminPassword = (process.env.ADMIN_DEFAULT_PASSWORD || "")
          .trim()
          .replace(/^["']|["']$/g, "");

        if (
          envAdminEmail &&
          envAdminPassword &&
          dbReachable &&
          !dbUserExists &&
          lowerIdentifier === envAdminEmail &&
          safeEqual(cleanPassword, envAdminPassword)
        ) {
          if (dbReachable) {
            try {
              const admin = await prisma.user.upsert({
                where: { email: envAdminEmail },
                update: {
                  role: "ADMIN",
                  isActive: true,
                  passwordHash: await bcrypt.hash(envAdminPassword, 10),
                },
                create: {
                  name: "it's matapanda Admin",
                  email: envAdminEmail,
                  passwordHash: await bcrypt.hash(envAdminPassword, 10),
                  role: "ADMIN",
                  isActive: true,
                },
              });
              return { id: admin.id, name: admin.name, email: admin.email, role: "ADMIN" };
            } catch (upsertErr) {
              console.warn("[Auth] Failed to create bootstrap admin:", upsertErr);
            }
          }

          return {
            id: "00000000-0000-4000-8000-000000000001",
            name: "it'smatapanda Admin",
            email: envAdminEmail,
            role: "ADMIN",
          };
        }

        // 1b. E2E Isolated Test Admin Fallback (from .env)
        const e2eAdminEmail = (
          process.env.E2E_TEST_ADMIN_EMAIL || "e2e-test-admin@itsmatapanda.test"
        ).toLowerCase();
        const e2eAdminPassword = process.env.E2E_TEST_ADMIN_PASSWORD;

        if (
          e2eAdminPassword &&
          process.env.VERCEL_ENV !== "production" &&
          lowerIdentifier === e2eAdminEmail &&
          (inputPassword === e2eAdminPassword || cleanPassword === e2eAdminPassword.trim())
        ) {
          return {
            id: "00000000-0000-4000-8000-000000000002",
            name: "E2E Test Admin",
            email: e2eAdminEmail,
            role: "ADMIN",
          };
        }

        // 3. Demo Customer Fallback (local development only)
        if (
          process.env.NODE_ENV !== "production" &&
          (lowerIdentifier === "customer@itsmatapanda.com" ||
            lowerIdentifier === "user@itsmatapanda.com" ||
            identifier === "081234567890") &&
          (inputPassword === "customer123" || inputPassword === "password123")
        ) {
          return {
            id: "00000000-0000-4000-8000-000000000002",
            name: "Customer it's matapanda",
            email: "customer@itsmatapanda.com",
            role: "CUSTOMER",
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
        token.checkedAt = Date.now();
        return token;
      }
      // Re-check the account every minute so a deactivated, deleted or
      // demoted user loses access in server routes (getServerSession) too.
      const id = typeof token.id === "string" ? token.id : "";
      const last = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      if (id && token.role !== "REVOKED" && Date.now() - last > 60_000) {
        if (id.startsWith("00000000-0000-4000-8000-")) {
          if (process.env.VERCEL_ENV === "production") token.role = "REVOKED";
        } else {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id },
              select: { role: true, isActive: true, deletedAt: true },
            });
            token.role = dbUser && dbUser.isActive && !dbUser.deletedAt ? dbUser.role : "REVOKED";
          } catch (err) {
            console.warn("[Auth] Session re-check failed:", err);
          }
        }
        token.checkedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id =
          token.id as string;
        (session.user as { id?: string; role?: string }).role =
          (token.role as string) ?? "CUSTOMER";
      }
      return session;
    },
  },
  secret: getAuthSecret(),
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production" &&
        process.env.NEXTAUTH_URL?.startsWith("https://")
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure:
          process.env.NODE_ENV === "production" &&
          process.env.NEXTAUTH_URL?.startsWith("https://"),
      },
    },
  },
};
