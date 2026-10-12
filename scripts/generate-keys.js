#!/usr/bin/env node

/**
 * Generate cryptographically secure keys for production environment variables:
 * - NEXTAUTH_SECRET
 * - MARKETPLACE_ENCRYPTION_KEY (AES-256-GCM 32-byte hex)
 * - CRON_SECRET
 *
 * Usage:
 *   node scripts/generate-keys.js
 */

const crypto = require("crypto");

console.log("\n=======================================================");
console.log("  PRODUCTION SECRET GENERATOR");
console.log("=======================================================\n");

const nextAuthSecret = crypto.randomBytes(32).toString("base64");
const marketplaceKey = crypto.randomBytes(32).toString("hex");
const cronSecret = crypto.randomBytes(24).toString("hex");

console.log("Salin nilai-nilai berikut ke file .env production Anda:\n");
console.log(`NEXTAUTH_SECRET="${nextAuthSecret}"`);
console.log(`MARKETPLACE_ENCRYPTION_KEY="${marketplaceKey}"`);
console.log(`CRON_SECRET="${cronSecret}"`);
console.log("\nCATATAN:");
console.log("- JANGAN bagikan atau commit nilai-nilai di atas ke Git repository.");
console.log("- Simpan backup MARKETPLACE_ENCRYPTION_KEY di tempat aman karena jika hilang,");
console.log("  token akses marketplace yang tersimpan di database tidak dapat didekripsi.");
console.log("=======================================================\n");
