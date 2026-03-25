## S3 Storage (AWS + Cloudflare R2)

- Dual-provider setup: write to both AWS S3 and Cloudflare R2. Read/presign from both.
- Cloudflare R2 URL always comes first in arrays of URLs.
- Use a shared `S3` client in `src/lib/S3.ts` with methods for both providers.
- R2 uses the S3-compatible API — same SDK, different endpoint and credentials.
- Presigned URLs: generate from both providers. Client receives both and can fall back.
- File uploads: upload to both providers in parallel using `Promise.all()`.
- Bucket naming: use consistent bucket names across providers (e.g., `myapp-uploads`).
- Use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (provided by Lambda runtime).
