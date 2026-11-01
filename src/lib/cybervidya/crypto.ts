/**
 * crypto.ts — AES-128-CBC encryption utility for CyberVidya credentials
 *
 * Implements byte-compatible encryption matching CyberVidya's frontend bundle:
 * Algorithm: AES-128-CBC with PKCS#7 padding
 * Key (base64): NPdLWA5w7yFQhPeUuKmO/A==
 * IV (base64):  bV5V6nK4phvQG9ZhkAjugQ==
 */

import crypto from 'crypto'

export const CYBERVIDYA_KEY_BASE64 = 'NPdLWA5w7yFQhPeUuKmO/A=='
export const CYBERVIDYA_IV_BASE64 = 'bV5V6nK4phvQG9ZhkAjugQ=='

const KEY_BUFFER = Buffer.from(CYBERVIDYA_KEY_BASE64, 'base64')
const IV_BUFFER = Buffer.from(CYBERVIDYA_IV_BASE64, 'base64')

/**
 * Encrypt a plaintext string (e.g. username, password) using CyberVidya's AES-128-CBC cipher.
 * Returns a base64 encoded ciphertext string.
 */
export function encryptCyberVidyaString(plaintext: string): string {
  if (!plaintext) return ''
  const cipher = crypto.createCipheriv('aes-128-cbc', KEY_BUFFER, IV_BUFFER)
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  return encrypted
}

/**
 * Decrypt a CyberVidya ciphertext string back to plaintext.
 * Primarily used for verification and regression tests.
 */
export function decryptCyberVidyaString(ciphertextBase64: string): string {
  if (!ciphertextBase64) return ''
  const decipher = crypto.createDecipheriv('aes-128-cbc', KEY_BUFFER, IV_BUFFER)
  let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
