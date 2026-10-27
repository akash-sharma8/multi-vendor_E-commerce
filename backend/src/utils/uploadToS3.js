import { PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';
import s3 from '../config/s3.js';

export default async function uploadToS3(file, folder = 'products') {
  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${folder}/${crypto.randomUUID()}${ext}`;

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