import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const identifier = credentials.identifier.trim();
        const inputPassword = credentials.password;
        const isEmail = identifier.includes("@");
        const lowerIdentifier = identifier.toLowerCase();

        // 1. Fast-path Admin Credentials (from .env)
        const defaultAdminEmail = (
          process.env.ADMIN_DEFAULT_EMAIL || "jorgifatwaambia@gmail.com"
        ).toLowerCase();
        const defaultAdminPassword =
          process.env.ADMIN_DEFAULT_PASSWORD || "admin123";

        if (
          lowerIdentifier === defaultAdminEmail &&
          inputPassword === defaultAdminPassword
        ) {
          return {
            id: "00000000-0000-4000-8000-000000000001",
            name: "it'smatapanda Admin",
            email: defaultAdminEmail,
            role: "ADMIN",
          };
        }

        // 1b. E2E Isolated Test Admin Fallback (from .env)
        const e2eAdminEmail = (
          process.env.E2E_TEST_ADMIN_EMAIL || "e2e-test-admin@zodiac.test"
        ).toLowerCase();
        const e2eAdminPassword = process.env.E2E_TEST_ADMIN_PASSWORD;

        if (
          e2eAdminPassword &&
          lowerIdentifier === e2eAdminEmail &&
          inputPassword === e2eAdminPassword
        ) {
          return {
            id: "00000000-0000-4000-8000-000000000002",
            name: "E2E Test Admin",
            email: e2eAdminEmail,
            role: "ADMIN",
          };
        }

        // 2. Query PostgreSQL via Prisma if database is available
        try {
          const dbUser = await prisma.user.findFirst({
            where: {
              isActive: true,
              OR: isEmail
                ? [{ email: lowerIdentifier }]
                : [{ phone: identifier }, { email: lowerIdentifier }],
            },
          });

          if (dbUser && dbUser.passwordHash) {
            const valid = await bcrypt.compare(
              inputPassword,
              dbUser.passwordHash
            );
            if (valid) {
              return {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role,
              };
            }
          }
        } catch {
          // Database query fallback
        }

        if (
          e2eAdminPassword &&
          lowerIdentifier === e2eAdminEmail &&
          inputPassword === e2eAdminPassword
        ) {
          return {
            id: "00000000-0000-4000-8000-000000000099",
            name: "E2E Test Administrator",
            email: e2eAdminEmail,
            role: "ADMIN",
          };
        }

        // 3. Demo Customer Fallback (for easy instant local testing)
        if (
          (lowerIdentifier === "customer@zodiacjakarta.com" ||
            lowerIdentifier === "user@zodiacjakarta.com" ||
            identifier === "081234567890") &&
          (inputPassword === "customer123" || inputPassword === "password123")
        ) {
          return {
            id: "00000000-0000-4000-8000-000000000002",
            name: "Customer ZODIAC",
            email: "customer@zodiacjakarta.com",
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
  secret:
    process.env.NEXTAUTH_SECRET ||
    "zodiac-super-secret-jwt-key-change-in-production-2026",
};
