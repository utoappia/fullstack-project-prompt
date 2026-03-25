import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

const envFile = process.env.ENV === 'prod' ? '.env.prod' : '.env.dev';
dotenv.config({ path: envFile });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
