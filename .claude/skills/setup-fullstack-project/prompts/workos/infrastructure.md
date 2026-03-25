## WorkOS Infrastructure: Audit Logs, Webhooks, Vault, Radar, Feature Flags

### Audit Logs

Structured, queryable activity logs for enterprise compliance (SOC 2, HIPAA, ISO 27001).

```typescript
// Create an audit log event
await workos.auditLogs.createEvent('org_01HRDMC6...', {
  action: 'document.updated',
  occurredAt: new Date().toISOString(),
  actor: {
    type: 'user',
    id: 'user_01E4ZCR...',
    name: 'Jane Doe',
  },
  targets: [{
    type: 'document',
    id: 'doc_123',
    name: 'Q4 Report',
  }],
  context: {
    location: '200.0.0.1',
    userAgent: 'Mozilla/5.0...',
  },
  metadata: {
    changedFields: ['title', 'content'],
  },
});
```

**Idempotency:** use `Idempotency-Key` header (UUID, expires after 24 hours) to prevent duplicate events.

**Schema management:** define event schemas (action types, actor types, target types) via API or dashboard.

**Retention:** `PUT /organizations/{id}/audit_logs_retention` — valid values: 30 or 365 days only.

**Exports:** export audit logs to a downloadable file (CSV, download URL expires after 10 minutes):
```typescript
const exportObj = await workos.auditLogs.createExport({
  organizationId: 'org_01HRDMC6...',
  rangeStart: '2024-01-01T00:00:00Z',
  rangeEnd: '2024-12-31T23:59:59Z',
});
// Poll for completion, then download
const result = await workos.auditLogs.getExport(exportObj.id);
```

**Retention:** configurable per-organization retention period.

**Admin Portal:** let customers view their own audit logs via `intent: 'audit_logs'`.

### Webhooks

WorkOS sends webhook events for changes across all features:

```typescript
// Verify webhook signature
const event = workos.webhooks.constructEvent({
  payload: req.body,
  sigHeader: req.headers['workos-signature'],
  secret: process.env.WORKOS_WEBHOOK_SECRET,
});

switch (event.event) {
  case 'user.created':
  case 'user.updated':
    await syncUser(event.data);
    break;
  case 'dsync.user.created':
    await createUserFromDirectory(event.data);
    break;
  case 'organization_membership.created':
    await addMemberToOrg(event.data);
    break;
  case 'authentication.email_verification_succeeded':
    await markEmailVerified(event.data);
    break;
}
```

**Key event types:**
- `user.created`, `user.updated`, `user.deleted`
- `organization.created`, `organization.updated`, `organization.deleted`
- `organization_membership.created`, `organization_membership.updated`, `organization_membership.deleted`
- `dsync.user.created`, `dsync.user.updated`, `dsync.user.deleted`
- `dsync.group.created`, `dsync.group.updated`, `dsync.group.deleted`
- `authentication.*` events (various auth lifecycle events)
- `session.created`
- `connection.activated`, `connection.deactivated`, `connection.deleted`
- `directory.activated`, `directory.deleted`

**Webhook management via API:**
```typescript
// Create webhook endpoint
await workos.webhooks.createWebhookEndpoint({
  url: 'https://your-api.com/webhooks/workos',
  events: ['user.created', 'user.updated', 'dsync.user.created'],
});

// List endpoints
const { data: endpoints } = await workos.webhooks.listWebhookEndpoints();
```

### Vault (Encrypted Storage)

Store sensitive data (API keys, tokens, PII) encrypted at rest with key management:

```typescript
// Store encrypted data
const obj = await workos.vault.createObject({
  name: 'stripe_api_key',
  value: 'sk_live_xxx',
  environment: 'production',
});

// Retrieve decrypted
const result = await workos.vault.readObject(obj.id);
// result.value = 'sk_live_xxx'

// List objects (metadata only, not decrypted)
const { data: objects } = await workos.vault.listObjects();

// Key rotation
await workos.vault.rotateKey(keyId);
```

### Radar (Bot Detection & Risk)

Detect and block suspicious authentication attempts:

```typescript
// Create an attempt (during auth flow)
const attempt = await workos.radar.createAttempt({
  email: 'user@example.com',
  ipAddress: '203.0.113.42',
  userAgent: req.headers['user-agent'],
  action: 'sign_in',
});
// attempt.verdict: 'allowed' | 'denied' | 'challenged'

// Manage allow/deny lists
await workos.radar.addListEntry({
  listType: 'deny',
  value: '203.0.113.0/24',
  valueType: 'ip_address',
});
```

### Feature Flags

Control feature rollout per user, organization, or environment:

```typescript
// Check flag (from JWT claims — no API call needed)
const { feature_flags } = decodedToken;
const hasAdvancedAnalytics = feature_flags.includes('advanced-analytics');

// Or check via API
const flag = await workos.featureFlags.getFlag('advanced-analytics');

// Enable/disable per environment
await workos.featureFlags.enableFlag('advanced-analytics');
await workos.featureFlags.disableFlag('advanced-analytics');

// Targeting rules
await workos.featureFlags.updateTargeting('advanced-analytics', {
  rules: [
    { type: 'organization', ids: ['org_01HRDMC6...'] },
    { type: 'user', ids: ['user_01E4ZCR...'] },
  ],
});
```

Feature flags appear in the JWT access token (`feature_flags` claim) — check them without an API call.

### Events API

Query all WorkOS events (across all features):

```typescript
const { data: events } = await workos.events.listEvents({
  events: ['user.created', 'organization.updated'],
  after: 'event_01E4ZCR...',
  limit: 100,
});
```

### Pagination

All list endpoints use cursor-based pagination:

```typescript
const { data, listMetadata } = await workos.userManagement.listUsers({ limit: 10 });
// listMetadata: { before: '...', after: '...' }

// Next page
const nextPage = await workos.userManagement.listUsers({
  limit: 10,
  after: listMetadata.after,
});
```

### WorkOS Connect (OAuth/OIDC for M2M and external apps)

For machine-to-machine auth (backend services, CLI tools) or building an OAuth provider:

```typescript
// Client credentials grant (M2M — no user involved)
const response = await fetch('https://your-authkit-domain/oauth2/token', {
  method: 'POST',
  body: new URLSearchParams({
    client_id: 'client_123',
    client_secret: 'secret_456',
    grant_type: 'client_credentials',
    scope: 'api:read api:write',
  }),
});
const { access_token, expires_in } = await response.json();
```

Supports 4 grant types: `authorization_code`, `client_credentials`, `refresh_token`, `device_code`.

### Widgets (embeddable React components)

Drop-in UI components for enterprise workflows. Generate a scoped token server-side:

```typescript
const { token } = await workos.widgets.getToken({
  organizationId: 'org_01HRDMC6...',
  userId: 'user_01E4ZCR...',
  scopes: ['widgets:users-table:manage', 'widgets:sso:manage'],
});
// Pass token to frontend widget component
```

Available widget scopes: `users-table:manage`, `domain-verification:manage`, `sso:manage`, `api-keys:manage`, `dsync:manage`, `audit-log-streaming:manage`.

### Rate Limits

Key limits:
- Global: 6,000 requests per 60 seconds per IP
- AuthKit reads: 1,000 per 10 seconds
- AuthKit writes: 500 per 10 seconds
- AuthKit authenticate: 10 per 60 seconds per email
- Magic auth send: 3 per 60 seconds per email
- Password reset send: 3 per 60 seconds per email
- SSO authorize: 1,000 per 60 seconds per connection

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. HTTP 429 when exceeded — implement exponential backoff.

### Testing

- Staging environment with pre-generated API keys (viewable multiple times)
- Test users and organizations in staging
- Webhook testing via dashboard event replay
- WorkOS Postman collection available for API testing

### Key rules

- Always verify webhook signatures before processing events.
- Use the Events API for catch-up sync if webhooks are missed.
- Store secrets in Vault, not in environment variables or database fields.
- Feature flags in the JWT avoid API calls — check them at the edge or in your API handler.
- Audit logs are per-organization. Use structured schemas for consistent event formatting.
- Use Radar for auth flows handling sensitive operations (login, password reset, payment).
