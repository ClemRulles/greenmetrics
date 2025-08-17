import { createHash } from 'crypto';

/**
 * Generate SHA-256 hash of a buffer as hex string
 * @param buf - Buffer to hash
 * @returns SHA-256 hash as hex string
 */
export async function sha256Hex(buf: Buffer): Promise<string> {
  return createHash('sha256').update(buf).digest('hex');
}

/**
 * Generate SHA-256 hash of a string as hex string
 * @param str - String to hash
 * @returns SHA-256 hash as hex string
 */
export async function sha256HexString(str: string): Promise<string> {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}
