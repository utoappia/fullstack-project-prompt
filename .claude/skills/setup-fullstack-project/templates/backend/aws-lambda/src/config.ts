import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Determine environment: ENV=dev or ENV=prod (defaults to dev)
const env = (process.env.ENV || 'dev') as 'dev' | 'prod';

// Load .env.dev or .env.prod when running locally (not in Lambda).
// Lambda injects env vars via its runtime — no .env files needed there.
const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(__dirname, '..', `.env.${env}`);
if (existsSync(envFile)) {
  dotenvConfig({ path: envFile });
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  env,
  databaseUrl: requireEnv('DATABASE_URL'),
  aws: {
    region: requireEnv('AWS_REGION'),
    s3Bucket: requireEnv('S3_BUCKET'),
  },
  r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
};
