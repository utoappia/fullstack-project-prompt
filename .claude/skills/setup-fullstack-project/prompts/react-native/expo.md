## Expo Conventions

- Use `expo-router` for navigation (file-based routing in `app/` directory).
- Use `app.config.ts` (not `app.json`) for dynamic configuration.
- Prefer Expo SDK packages over community alternatives when available (e.g., `expo-camera`, `expo-file-system`, `expo-image`).
- Use Expo config plugins instead of modifying native code directly.
- Build with EAS Build (`eas build`), not `expo build`.
- Use EAS Update for OTA updates.
- Run `npx expo-doctor` to diagnose project issues.
- Use `expo-constants` for runtime config values.
- Environment variables: use `.env` files with `expo-env.d.ts` type declarations.
- For native modules not covered by Expo, use a config plugin or prebuild (`npx expo prebuild`).
