/**
 * marketplace-crypto.ts
 *
 * AES-256-GCM encryption/decryption helpers for marketplace OAuth tokens.
 * Tokens are NEVER stored as plaintext in the database.
 *
 * Storage format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * Required env var:
 *   MARKETPLACE_ENCRYPTION_KEY — a 64-character lowercase hex string (32 bytes).
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

function getEncryptionKey(): Buffer {
  const keyHex = process.env.MARKETPLACE_ENCRYPTION_KEY;
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      "[marketplace-crypto] MARKETPLACE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypt a plaintext string (e.g. an access_token).
 * Returns a string in the format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Decrypt a token previously encrypted with encryptToken().
 * Throws if the ciphertext is tampered or the key is wrong.
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("[marketplace-crypto] Invalid ciphertext format. Expected iv:authTag:ciphertext");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Returns true if the provided string looks like an encrypted token
 * (i.e. has the iv:authTag:ciphertext format).
 */
export function isEncryptedToken(value: string): boolean {
  return value.split(":").length === 3;
}
