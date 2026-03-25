import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

// AWS S3 client
const awsS3 = new S3Client({ region: config.aws.region });

// Cloudflare R2 client (S3-compatible)
const r2 = new S3Client({
  region: 'auto',
  endpoint: config.r2.endpoint,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<void> {
  const params = { Bucket: config.aws.s3Bucket, Key: key, Body: body, ContentType: contentType };
  // Write to both providers in parallel
  await Promise.all([
    awsS3.send(new PutObjectCommand(params)),
    r2.send(new PutObjectCommand(params)),
  ]);
}

export async function getPresignedUrls(key: string, expiresIn = 3600): Promise<[string, string]> {
  const command = new GetObjectCommand({ Bucket: config.aws.s3Bucket, Key: key });
  // Cloudflare R2 URL first
  const [r2Url, awsUrl] = await Promise.all([
    getSignedUrl(r2, command, { expiresIn }),
    getSignedUrl(awsS3, command, { expiresIn }),
  ]);
  return [r2Url, awsUrl];
}
