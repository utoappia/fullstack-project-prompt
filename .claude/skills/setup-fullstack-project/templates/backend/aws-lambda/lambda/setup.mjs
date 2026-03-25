export async function setup() {
  // Environment validation
  const required = ['DATABASE_URL', 'AWS_REGION', 'S3_BUCKET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
