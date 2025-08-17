import { promises as fs } from 'fs';
import path from 'path';

const BASE = process.env.FILE_STORAGE_DIR ?? path.join(process.cwd(), '.data/files');

/**
 * Store a file buffer at the given key path
 * @param key - Storage key/path
 * @param buf - File buffer to store
 * @returns Full path where file was stored
 */
export async function putFile(key: string, buf: Buffer): Promise<string> {
  const full = path.join(BASE, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  return full;
}

/**
 * Remove a file at the given key path
 * @param key - Storage key/path to remove
 */
export async function removeFile(key: string): Promise<void> {
  const full = path.join(BASE, key);
  await fs.rm(full, { force: true });
}

/**
 * Get a file buffer from the given key path
 * @param key - Storage key/path
 * @returns File buffer or null if not found
 */
export async function getFile(key: string): Promise<Buffer | null> {
  try {
    const full = path.join(BASE, key);
    return await fs.readFile(full);
  } catch (error) {
    if ((error as any)?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Check if a file exists at the given key path
 * @param key - Storage key/path
 * @returns True if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const full = path.join(BASE, key);
    await fs.access(full);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure storage directory exists
 */
export async function ensureStorageDir(): Promise<void> {
  await fs.mkdir(BASE, { recursive: true });
}
