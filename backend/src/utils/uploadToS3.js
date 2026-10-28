import { PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import s3 from '../config/s3.js';

export default async function uploadToS3(file, folder = 'products') {
  const ext = path.extname(file.originalname).toLowerCase();
  const name = `${crypto.randomUUID()}${ext}`;

  if (process.env.STORAGE === 's3') {
    const key = `${folder}/${name}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );
    return `${process.env.S3_PUBLIC_URL}/${key}`;
  }

  // local disk, for development only
  const dir = path.join(process.cwd(), 'uploads', folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), file.buffer);
  return `${process.env.APP_URL}/uploads/${folder}/${name}`;
}