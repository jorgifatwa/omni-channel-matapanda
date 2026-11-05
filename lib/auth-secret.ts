/**
 * NextAuth JWT secret.
 * In production NEXTAUTH_SECRET is mandatory: a publicly known fallback would let
 * anyone forge an ADMIN session token. The fallback is only used in development.
 */
const DEV_FALLBACK_SECRET = "matapanda-local-development-only-secret";

export function getAuthSecret(): string | undefined {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_SECRET;
  console.error("[Auth] NEXTAUTH_SECRET is not set. Login is disabled until it is configured.");
  return undefined;
}
