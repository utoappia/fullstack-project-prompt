## WorkOS SSO & Directory Sync

### Single Sign-On (SSO)

WorkOS SSO lets your app authenticate users through enterprise identity providers (Okta, Azure AD, Google Workspace, OneLogin, etc.) via SAML or OIDC.

**Authorization URL:**
```typescript
const authorizationUrl = workos.sso.getAuthorizationUrl({
  connectionId: 'conn_01E4ZCR...',  // or organizationId, or provider
  clientId: 'client_123456789',
  redirectUri: 'https://your-app.com/callback',
  state: 'random_state_string',
});
// Redirect user to authorizationUrl
```

**Profile exchange (callback):**
```typescript
const { profile } = await workos.sso.getProfileAndToken({
  clientId: 'client_123456789',
  code: req.query.code,
});
// profile: { id, idp_id, connection_id, connection_type, organization_id, email, first_name, last_name, groups, raw_attributes }
```

**Connection management:**
```typescript
// Get connection
const connection = await workos.sso.getConnection('conn_01E4ZCR...');

// List connections
const { data: connections } = await workos.sso.listConnections({
  organizationId: 'org_01HRDMC6...',
});

// Delete connection
await workos.sso.deleteConnection('conn_01E4ZCR...');
```

**Supported SAML IdPs (25+):** Okta, Azure AD (Entra ID), Google Workspace, OneLogin, JumpCloud, PingFederate, PingOne, Auth0, CyberArk, Duo, Keycloak, LastPass, miniOrange, Rippling, Salesforce, Shibboleth, VMware, Oracle, NetIQ, AD FS, CAS, ClassLink, Cloudflare, SimpleSAMLphp.

**Supported OIDC IdPs:** Generic OIDC, ADP, Clever, Entra ID, Google, Okta, Login.gov.

**Social OAuth providers (12):** Apple, GitHub, GitLab, Google, Intuit, LinkedIn, Microsoft, Salesforce, Slack, Vercel, Xero.

All SAML integrations follow the same pattern: WorkOS provides ACS URL + SP Entity ID + SP Metadata URL. Customer provides IdP Metadata URL. Required attributes: `id`, `email`, `firstName`, `lastName`. Optional: `groups`.

**SSO Logout:**
```typescript
const logoutUrl = workos.sso.getLogoutUrl({ sessionId: 'session_01...' });
// Redirect user to logoutUrl
```

### Admin Portal

Let your customers configure their own SSO connections and directory sync without your involvement:

```typescript
const { link } = await workos.portal.generateLink({
  intent: 'sso',  // or 'dsync', 'audit_logs', 'log_streams'
  organizationId: 'org_01HRDMC6...',
  returnUrl: 'https://your-app.com/settings',
});
// Redirect customer admin to link
```

Portal intents: `sso` (configure SSO), `dsync` (configure directory sync), `audit_logs` (view audit logs), `log_streams` (configure log streaming).

### Directory Sync (SCIM)

Sync user directories from enterprise IdPs (Okta, Azure AD, etc.) to your app. WorkOS handles the SCIM protocol.

```typescript
// Get directory
const directory = await workos.directorySync.getDirectory('directory_01E4ZCR...');

// List directories
const { data: directories } = await workos.directorySync.listDirectories({
  organizationId: 'org_01HRDMC6...',
});

// List directory users
const { data: users } = await workos.directorySync.listUsers({
  directoryId: 'directory_01E4ZCR...',
});
// user: { id, idp_id, directory_id, organization_id, first_name, last_name, email, username, state, groups, custom_attributes, raw_attributes }

// List directory groups
const { data: groups } = await workos.directorySync.listGroups({
  directoryId: 'directory_01E4ZCR...',
});
// group: { id, idp_id, directory_id, organization_id, name, raw_attributes }
```

**SCIM directories (real-time sync):** Generic SCIM v2.0, Azure AD (Entra ID), CyberArk, JumpCloud, Okta, OneLogin, PingFederate, Rippling, SailPoint.

**HRIS directories (30-min polling, require support enablement):** BambooHR, Breathe HR, Access People HR, Cezanne HR, Fourth, HiBob, Workday.

**Other:** Google Workspace (admin invitation flow, 30-min sync), SFTP (CSV upload, SSH key auth, 30-min sync).

**Webhook events for directory changes:**
- `dsync.user.created`, `dsync.user.updated`, `dsync.user.deleted`
- `dsync.group.created`, `dsync.group.updated`, `dsync.group.deleted`
- `dsync.group.user_added`, `dsync.group.user_removed`

Use these webhooks to keep your app's user database in sync with the enterprise directory.

### Domain Verification

Verify that an organization owns a domain before auto-connecting SSO:

```typescript
// Create domain for an organization
const domain = await workos.organizationDomains.createOrganizationDomain({
  organizationId: 'org_01HRDMC6...',
  domain: 'example.com',
});

// Verify domain (DNS TXT record check)
await workos.organizationDomains.verifyOrganizationDomain('org_domain_01...');
```

### Key rules

- Use the **Admin Portal** to let customers self-configure SSO — don't build your own SSO setup UI.
- Always handle the `sso_required` authentication error — redirect to SSO when the org requires it.
- Directory Sync events arrive via webhooks — set up webhook handlers to create/update/delete users in your database.
- Use `organizationId` (not `connectionId`) when initiating SSO to let WorkOS auto-select the right connection.
