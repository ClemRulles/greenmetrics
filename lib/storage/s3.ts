// S3 storage driver scaffold - implement when needed
import type { StorageDriver } from './index';

export class S3Storage implements StorageDriver {
  constructor(private bucket: string, private region: string) {
    // TODO: Implement S3 client when needed
  }

  async put(): Promise<void> {
    throw new Error('S3 storage not implemented yet');
  }

  async get(): Promise<Buffer> {
    throw new Error('S3 storage not implemented yet');
  }

  async exists(): Promise<boolean> {
    throw new Error('S3 storage not implemented yet');
  }
}
