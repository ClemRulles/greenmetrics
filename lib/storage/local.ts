import { promises as fs } from 'fs';
import * as path from 'path';
import type { StorageDriver } from './index';

export class LocalStorage implements StorageDriver {
  constructor(private baseDir: string) {}
  
  private full(key: string) { 
    return path.join(this.baseDir, key); 
  }

  async put(key: string, buf: Buffer) {
    await fs.mkdir(path.dirname(this.full(key)), { recursive: true });
    await fs.writeFile(this.full(key), buf);
  }
  
  async get(key: string) {
    return fs.readFile(this.full(key));
  }
  
  async exists(key: string) {
    try { 
      await fs.access(this.full(key)); 
      return true; 
    } catch { 
      return false; 
    }
  }
}
