## WorkOS Organizations, Roles & Permissions

### Organizations

Organizations represent your B2B customers (companies, teams). Each org can have its own SSO connection, directory, and members.

```typescript
// Create
const org = await workos.organizations.createOrganization({
  name: 'Acme Corp',
  domains: ['acme.com'], // optional: auto-map users by email domain
});

// Get
const org = await workos.organizations.getOrganization('org_01HRDMC6...');

// List
const { data: orgs } = await workos.organizations.listOrganizations();

// Update
await workos.organizations.updateOrganization({
  organizationId: 'org_01HRDMC6...',
  name: 'Acme Corporation',
});

// Delete
await workos.organizations.deleteOrganization('org_01HRDMC6...');
```

### Roles (RBAC)

WorkOS supports two levels of roles:

**Environment roles** — global roles across your WorkOS environment:
```typescript
// Create role
const role = await workos.roles.createRole({
  name: 'Manager',
  slug: 'manager',
  description: 'Can manage team members',
  permissions: ['users:read', 'users:write', 'billing:read'],
});

// List roles
const { data: roles } = await workos.roles.listRoles();
```

**Organization roles** — roles scoped to a specific organization:
```typescript
// Create org role
const role = await workos.roles.createOrganizationRole({
  organizationId: 'org_01HRDMC6...',
  name: 'Project Lead',
  slug: 'project-lead',
  permissions: ['projects:manage', 'users:read'],
});

// List org roles
const { data: roles } = await workos.roles.listOrganizationRoles({
  organizationId: 'org_01HRDMC6...',
});
```

**Permissions:**
```typescript
// Create permission
const permission = await workos.roles.createPermission({
  name: 'Manage Posts',
  slug: 'posts:manage',
  description: 'Create, edit, and delete posts',
});

// List permissions
const { data: permissions } = await workos.roles.listPermissions();
```

Roles and permissions appear in the JWT access token (`role`, `roles`, `permissions` claims). Check them in your API handlers:

```typescript
// In your API handler
const { permissions } = decodedToken;
if (!permissions.includes('posts:manage')) {
  return { statusCode: 403, message: 'Forbidden' };
}
```

### Fine-Grained Authorization (FGA)

For resource-level access control (e.g., "can user X edit project Y?"), use WorkOS FGA. Resources support parent-child hierarchy for permission inheritance.

```typescript
// Create a resource (scoped to an organization)
const resource = await workos.authorization.createResource({
  organizationId: 'org_01ABC...',
  resourceTypeSlug: 'project',
  externalId: 'proj-456',
  name: 'Website Redesign',
  parentResourceId: 'authz_resource_01XYZ...', // optional: inherit parent permissions
});

// Assign role on a resource (via organization membership)
const assignment = await workos.authorization.assignRole({
  organizationMembershipId: 'om_01HXYZ...',
  roleSlug: 'editor',
  resourceExternalId: 'proj-456',
  resourceTypeSlug: 'project',
});

// Check access
const { authorized } = await workos.authorization.check({
  organizationMembershipId: 'om_01HXYZ...',
  permissionSlug: 'project:edit',
  resourceExternalId: 'proj-456',
  resourceTypeSlug: 'project',
});

if (!authorized) {
  return { statusCode: 403, message: 'Cannot edit this project' };
}
```

**List accessible resources** for a member:
```typescript
const { data: resources } = await workos.authorization.listResourcesForMembership({
  organizationMembershipId: 'om_01HXYZ...',
  permissionSlug: 'project:read',
  parentResourceId: 'authz_resource_01XYZ...',
});
```

**List members with access** to a resource:
```typescript
const { data: memberships } = await workos.authorization.listMembershipsForResource({
  resourceId: 'authz_resource_01HXYZ...',
  permissionSlug: 'project:edit',
  assignment: 'direct', // or 'indirect' for inherited
});
```

Access checks evaluate: direct role assignments, inherited permissions from parent resources, and org-level roles. Changes take effect immediately.

**Delete resource** (also removes all role assignments, irreversible):
```typescript
await workos.authorization.deleteResource({
  resourceId: 'authz_resource_01...',
  cascadeDelete: true, // required for resources with children
});
```

### Key rules

- Use environment roles for app-wide permissions (admin, member). Use organization roles for per-customer role assignments.
- Organization role slugs must start with `org-`. Environment role slugs must be lowercase alphanumeric with hyphens/underscores.
- Cannot delete roles with active assignments (409 error). Remove assignments first.
- Permissions in the JWT are derived from the user's role. No API call needed to check permissions at request time.
- Use FGA when you need resource-level access control (per-document, per-project permissions). Use RBAC (roles + permissions) for feature-level access.
- FGA supports parent-child resource hierarchy — assign a role on a parent, and it's inherited by children.
- Always check permissions server-side in your API handlers. Never trust client-side role checks alone.
