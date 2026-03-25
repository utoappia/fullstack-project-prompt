## Log Piping

React Native logs are piped to files so Claude Code can read them directly without asking for console output.

### Log file locations
- Metro bundler output: `/tmp/rn-logs.txt`
- Android logcat errors: `/tmp/android-errors.txt`

### npm scripts
- `npm run dev:ios` — starts Metro with output piped to `/tmp/rn-logs.txt`
- `npm run dev:android` — starts Metro with output piped to `/tmp/rn-logs.txt`
- `npm run dev:android:logs` — captures `adb logcat *:E` to `/tmp/android-errors.txt`

### When debugging
- Read `/tmp/rn-logs.txt` for Metro bundler errors, JS exceptions, and warnings.
- Read `/tmp/android-errors.txt` for native Android crashes and errors.
- Never ask the user to paste console output — always read the log files.
