## WorkOS AuthKit — Authentication & User Management

WorkOS AuthKit provides a complete authentication system: user management, OAuth/SSO, MFA, magic links, session management, and organization memberships. It replaces building auth from scratch or using Firebase Auth/Auth0.

### SDK setup

**Backend SDK (Node.js):**
```bash
npm install @workos-inc/node  # v8.9.0+, requires Node.js 20+
```

```typescript
import { WorkOS } from '@workos-inc/node';
const workos = new WorkOS('sk_example_123456789');
```

**React Native — no dedicated SDK.** For Expo projects, use `expo-auth-session` + `expo-web-browser` to redirect to AuthKit's hosted UI, then exchange the code on your backend. For bare React Native, use a similar WebBrowser-based OAuth flow.

**Web frontend SDKs:** `authkit-nextjs` (Next.js), `authkit-react` (React SPA), `authkit-remix`, `authkit-react-router`, `authkit-js` (vanilla JS).

**API keys:** prefixed with `sk_`. Staging keys are reusable; production keys are shown only once at creation. Base URL: `https://api.workos.com`.

### Authentication flow (AuthKit)

The standard flow uses OAuth 2.0 with AuthKit's hosted UI:

```typescript
// 1. Generate authorization URL
const authorizationUrl = workos.userManagement.getAuthorizationUrl({
  provider: 'authkit',  // or 'GoogleOAuth', 'MicrosoftOAuth', 'GitHubOAuth', 'AppleOAuth'
  clientId: 'client_123456789',
  redirectUri: 'https://your-app.com/callback',
  state: 'random_state_string',
  screenHint: 'sign-up', // or 'sign-in'
});
// Redirect user to authorizationUrl

// 2. Handle callback — exchange code for tokens
const { user, accessToken, refreshToken, organizationId } =
  await workos.userManagement.authenticateWithCode({
    clientId: 'client_123456789',
    code: req.query.code, // from callback URL
  });

// 3. Refresh tokens when access token expires
const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
  await workos.userManagement.authenticateWithRefreshToken({
    clientId: 'client_123456789',
    refreshToken: storedRefreshToken,
  });
```

**PKCE flow** (for public clients like React Native):
```typescript
// Generate code challenge from code verifier
const authorizationUrl = workos.userManagement.getAuthorizationUrl({
  provider: 'authkit',
  clientId: 'client_123456789',
  redirectUri: 'myapp://callback',
  codeChallenge: codeChallenge,
  codeChallengeMethod: 'S256',
});

// Exchange with code verifier
const result = await workos.userManagement.authenticateWithCode({
  clientId: 'client_123456789',
  code: callbackCode,
  codeVerifier: codeVerifier,
});
```

### Access token (JWT) claims

```json
{
  "iss": "https://api.workos.com",
  "sub": "user_01HBEQKA...",
  "org_id": "org_01HRDMC6...",
  "role": "member",
  "roles": ["member"],
  "permissions": ["posts:read", "posts:write"],
  "entitlements": ["audit-logs"],
  "feature_flags": ["advanced-analytics"],
  "sid": "session_01HQSXZGF...",
  "exp": 1709193857,
  "iat": 1709193557
}
```

Verify JWT signatures via JWKS: `https://api.workos.com/sso/jwks/{client_id}`

Customize JWT claims with Liquid templates via `PUT /user_management/jwt_template`.

### Session management

**Cookie-based sessions** (server-side, no database needed):
```typescript
// Load sealed session from cookie
const session = workos.userManagement.loadSealedSession({
  sessionData: req.cookies.session,
  cookiePassword: process.env.SESSION_SECRET, // 256-bit key
});

// Authenticate
const { authenticated, sessionId, organizationId, role, permissions } = await session.authenticate();

// Refresh
const { sealedSession } = await session.refresh();

// Logout URL
const logoutUrl = await session.getLogOutUrl();
```

### User CRUD

```typescript
// Create
const user = await workos.userManagement.createUser({
  email: 'jane@example.com',
  password: 'secure_password',
  firstName: 'Jane',
  lastName: 'Doe',
});

// Get
const user = await workos.userManagement.getUser('user_01E4ZCR...');

// List
const { data: users } = await workos.userManagement.listUsers({
  organizationId: 'org_01HRDMC6...',
});

// Update
await workos.userManagement.updateUser({
  userId: 'user_01E4ZCR...',
  firstName: 'Jane',
  metadata: { plan: 'pro' },
});

// Delete
await workos.userManagement.deleteUser('user_01E4ZCR...');
```

**Password hash migration:** supports `bcrypt`, `firebase-scrypt`, `ssha`, `scrypt`, `pbkdf2`, `argon2` via `passwordHash` and `passwordHashType` on create/update.

### Authentication error handling

Auth responses may return structured errors requiring specific handling:

| Error code | Meaning | Action |
|---|---|---|
| `email_verification_required` | Email must be verified | Send verification code, authenticate with code |
| `mfa_enrollment` | User must enroll in MFA | Show TOTP enrollment UI (QR code) |
| `mfa_challenge` | User must complete MFA | Show TOTP code entry |
| `organization_selection_required` | User belongs to multiple orgs | Show org picker |
| `sso_required` | Must use SSO for this org | Redirect to SSO authorization URL |

Each error includes a `pending_authentication_token` to continue the flow.

### Magic Auth (passwordless)

```typescript
// Send magic link code to email
const magicAuth = await workos.userManagement.createMagicAuth({
  email: 'jane@example.com',
});
// Code expires in 10 minutes

// Authenticate with the code
const result = await workos.userManagement.authenticateWithMagicAuth({
  clientId: 'client_123456789',
  code: userEnteredCode,
  email: 'jane@example.com',
});
```

### Multi-Factor Auth (TOTP)

```typescript
// Enroll user in TOTP
const { authenticationFactor, authenticationChallenge } =
  await workos.userManagement.enrollAuthFactor({
    userId: 'user_01E4ZCR...',
    type: 'totp',
    totpIssuer: 'Your App Name',
    totpUser: 'jane@example.com',
  });
// authenticationFactor.totp.qrCode — show to user
// authenticationFactor.totp.secret — backup code

// List enrolled factors
const factors = await workos.userManagement.listAuthFactors('user_01E4ZCR...');
```

### Password reset

```typescript
// Initiate reset
const passwordReset = await workos.userManagement.createPasswordReset({
  email: 'jane@example.com',
});
// passwordReset.passwordResetToken — send in email link

// Confirm reset
await workos.userManagement.confirmPasswordReset({
  token: resetToken,
  newPassword: 'new_secure_password',
});
// WARNING: All active sessions are revoked on password reset
```

### Organization memberships

```typescript
// Add user to org
const membership = await workos.userManagement.createOrganizationMembership({
  userId: 'user_01E4ZCR...',
  organizationId: 'org_01HRDMC6...',
  roleSlug: 'admin', // defaults to 'member'
});

// List memberships
const { data: memberships } = await workos.userManagement.listOrganizationMemberships({
  userId: 'user_01E4ZCR...',
  statuses: ['active'],
});

// Deactivate
await workos.userManagement.deactivateOrganizationMembership('om_01E4ZCR...');
```

Membership statuses: `active`, `inactive`, `pending`.

### Invitations

```typescript
// Send invitation
const invitation = await workos.userManagement.sendInvitation({
  email: 'new-user@example.com',
  organizationId: 'org_01HRDMC6...',
  roleSlug: 'member',
  expiresInDays: 7, // 1-30, default 7
});

// List pending invitations
const { data: invitations } = await workos.userManagement.listInvitations({
  organizationId: 'org_01HRDMC6...',
});

// Revoke
await workos.userManagement.revokeInvitation('invitation_01E4ZCR...');
```

### Supported OAuth providers

`AppleOAuth`, `BitbucketOAuth`, `DiscordOAuth`, `GithubOAuth`, `GitLabOAuth`, `GoogleOAuth`, `IntuitOAuth`, `LinkedInOAuth`, `MicrosoftOAuth`, `SalesforceOAuth`, `SlackOAuth`, `VercelOAuth`, `XeroOAuth`.

### React Native (Expo) auth flow

Since there's no dedicated React Native SDK, use the browser-based OAuth flow:

```bash
npx expo install expo-auth-session expo-web-browser
```

```typescript
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

const WORKOS_CLIENT_ID = 'client_123456789';
const WORKOS_CONNECTION_ID = 'conn_01E4ZCR...'; // or use organization_id

async function signIn() {
  const redirectUri = AuthSession.makeRedirectUri();

  // 1. Open AuthKit in browser
  const result = await WebBrowser.openAuthSessionAsync(
    `https://api.workos.com/sso/authorize?response_type=code&client_id=${WORKOS_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&connection=${WORKOS_CONNECTION_ID}`,
    redirectUri,
  );

  if (result.type !== 'success') return null;

  // 2. Extract authorization code from callback URL
  const code = new URL(result.url).searchParams.get('code');

  // 3. Exchange code on your backend (never send client_secret from mobile)
  const response = await fetch('https://your-api.com/auth/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri }),
  });

  return response.json(); // { user, accessToken, refreshToken }
}
```

**Backend callback handler** (Lambda or Vercel):
```typescript
export async function handler(params: { code: string; redirectUri: string }) {
  const { user, accessToken, refreshToken } = await workos.sso.getProfileAndToken({
    code: params.code,
    clientId: WORKOS_CLIENT_ID,
  });

  // Create session, return tokens to mobile app
  return { statusCode: 200, body: { user, accessToken, refreshToken } };
}
```

**Critical:** Register the Expo redirect URI in the WorkOS dashboard allowlist. The redirect URI changes between development and production — use `AuthSession.makeRedirectUri()` to generate it dynamically.

### Key rules

- Always use PKCE for React Native (public client). Never expose `client_secret` in mobile apps.
- Handle all authentication errors (`email_verification_required`, `mfa_enrollment`, etc.) — they're part of the normal flow, not exceptional errors.
- Refresh tokens may rotate on each use — always store the new one returned.
- Password resets revoke ALL active sessions.
- Use sealed sessions for cookie-based auth — no database needed for session lookup.
- Verify JWTs via the JWKS endpoint, not by trusting the token blindly.
- Use `metadata` field on users for app-specific data (plan, preferences).
