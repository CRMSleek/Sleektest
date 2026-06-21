import "server-only"

import crypto from "node:crypto"

const PREFIX = "v1"

function getEncryptionKey() {
  const raw = process.env.COMPLIANCE_ENCRYPTION_KEY
  if (!raw) return null

  const decoded = Buffer.from(raw, "base64")
  if (decoded.length === 32) return decoded

  const utf8 = Buffer.from(raw, "utf8")
  if (utf8.length === 32) return utf8

  throw new Error("COMPLIANCE_ENCRYPTION_KEY must be 32 bytes or base64-encoded 32 bytes")
}

export function hasComplianceEncryptionKey() {
  return Boolean(getEncryptionKey())
}

export function encryptSecret(value: string) {
  const key = getEncryptionKey()
  if (!key) return value

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [PREFIX, iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":")
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return ""
  if (!value.startsWith(`${PREFIX}:`)) return value

  const key = getEncryptionKey()
  if (!key) {
    throw new Error("COMPLIANCE_ENCRYPTION_KEY is required to decrypt stored secret")
  }

  const [, ivText, tagText, encryptedText] = value.split(":")
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64"))
  decipher.setAuthTag(Buffer.from(tagText, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64")),
    decipher.final(),
  ]).toString("utf8")
}
