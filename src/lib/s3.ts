import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.S3_REGION;
export const S3_BUCKET = process.env.S3_BUCKET as string | undefined;

if (!region) {
  // In build time we avoid throwing; runtime checks will validate presence
}

export const s3 = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

export async function getPresignedPutUrl(key: string, contentType: string, expiresInSeconds = 300): Promise<string> {
  if (!S3_BUCKET) throw new Error("S3_BUCKET is not set");
  const command = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType });
  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function getPresignedGetUrl(key: string, expiresInSeconds = 300): Promise<string> {
  if (!S3_BUCKET) throw new Error("S3_BUCKET is not set");
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}