import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "crypto";

/**
 * AES-256-GCM encryption for OAuth refresh tokens at rest (spec §58 "Secret을
 * Client Bundle에 포함하지 않는다" plus the general rule that a token stored
 * in the database is a secret too — the `...Enc` suffix on
 * Integration.refreshTokenEnc means something, not just a naming habit).
 *
 * Requires TOKEN_ENCRYPTION_KEY in the environment. Throws loudly rather
 * than silently storing plaintext if it's missing — a missing key should
 * fail the connect flow, not degrade to storing a real Google refresh token
 * unencrypted.
 */
function getKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and add it to your " +
        "environment before connecting Gmail/Drive — refresh tokens are never stored unencrypted."
    );
  }
  return scryptSync(secret, "ai-staff-os-token-salt", 32);
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptToken(stored: string): string {
  const [ivB64, authTagB64, dataB64] = stored.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Malformed encrypted token — expected iv.authTag.ciphertext");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
}
