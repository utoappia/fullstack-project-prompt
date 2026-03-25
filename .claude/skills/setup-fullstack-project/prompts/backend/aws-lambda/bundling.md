## Lambda Build & Bundling

- Build command: `npm run make_lambda_build`
- Uses esbuild to bundle all source + dependencies into a single `.mjs` file (~5MB vs ~190MB without bundling).
- esbuild config in `esbuild.lambda.mjs`:
  - Single entry point: `dist/lambda/index.mjs`
  - Platform: `node`, target: `node20`, format: `esm`
  - External: only `pg-native` (optional native addon, not needed)
  - Tree-shaking: enabled
  - `createRequire` banner for CJS compatibility with packages that need `require()`
- Build output goes to `_aws_lambda_build/nodejs/node_modules/@project/backend/`
- This structure is designed for Lambda Layers. The layer provides the backend package, and the Lambda function imports from it.
- The thin Lambda handler (`lambda/index.mjs`) imports from `@project/backend` and routes events.

### Lambda Layers vs esbuild bundling

- **Lambda Layers** are `.zip` archives extracted to `/opt` in the execution environment. Max 5 layers per function. ZIP deployments only (not container images).
- Layers are useful for: sharing dependencies across multiple functions, locking a specific AWS SDK version, or separating infrequently-changed dependencies from frequently-changed code.
- **For this project, esbuild bundling is preferred over layers for dependencies.** Bundling produces a single file with tree-shaking, resulting in a smaller package (~5MB) and faster cold starts than layers with full `node_modules`.
- Use layers only when you need to share code across multiple separate Lambda functions without redeploying each one.
