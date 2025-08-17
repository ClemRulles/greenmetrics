import { LocalStorage } from './local';
// import { S3Storage } from './s3';

export interface StorageDriver {
  put(key: string, buf: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
}

export function storage(): StorageDriver {
  const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();
  if (driver === 'local') return new LocalStorage(process.env.STORAGE_LOCAL_DIR || '.data/exports');
  // if (driver === 's3') return new S3Storage(process.env.STORAGE_S3_BUCKET!, process.env.AWS_REGION!);
  return new LocalStorage(process.env.STORAGE_LOCAL_DIR || '.data/exports');
}
