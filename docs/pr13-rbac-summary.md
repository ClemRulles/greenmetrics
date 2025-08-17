# PR #13: Role-Based Authorization & Admin Audit

## Overview
This PR implements comprehensive role-based access control (RBAC) across all sensitive endpoints and adds admin audit query capabilities, cementing compliance with least-privilege security principles.

## Key Features

### 🔐 RBAC Policy System
- **Role Hierarchy**: OWNER (3) > ADMIN (2) > EDITOR (1) > VIEWER (0)
- **Permission Matrix**:
  - `canCompute()`: EDITOR+ required
  - `canExport()`: VIEWER+ allowed
  - Admin functions: ADMIN+ required
- **Organization-scoped**: All permissions tied to organization membership

### 🛡️ Endpoint Protection
- **Compute Routes**: `/api/reports/[id]/compute` - EDITOR+ required
- **Export Routes**: `/api/reports/[id]/export` - VIEWER+ required  
- **Factor Management**: `/api/factors/*` - Role-aware access controls
- **Admin Audit**: `/api/admin/audit` - ADMIN+ required

### 📊 Admin Audit API
- **Query Parameters**: `orgId`, `action`, `from`, `to`, `limit`
- **Filters**: Action type, date range, organization scope
- **Response**: Audit entries with metadata, request correlation
- **Security**: Admin-only access with organization isolation

## Implementation Details

### Core RBAC Functions (`lib/rbac/policy.ts`)
```typescript
// Authentication & membership validation
requireUser(session): string
userOrgRole(userId, orgId): Role | null
requireOrgRole(userId, orgId, minRole): Promise<void>

// Permission checks
canCompute(userId, reportId): Promise<boolean>
canExport(userId, reportId): Promise<boolean>
requireAdminForOrg(userId, orgId): Promise<void>
```

### Route Authorization Pattern
```typescript
// Standard authorization flow
const session = await getServerSession(authOptions);
const userId = requireUser(session);
await requireOrgRole(userId, orgId, 'EDITOR');
```

### Error Handling
- **401 UNAUTHORIZED**: Missing/invalid authentication
- **403 FORBIDDEN**: Insufficient permissions for resource
- **422 VALIDATION**: Missing required parameters

## Security Compliance

### ✅ Least Privilege
- Users can only access resources in organizations they belong to
- Role-based permissions enforced at the API level
- Admin functions restricted to ADMIN+ roles

### ✅ Defense in Depth  
- Multiple authorization layers (auth + membership + permissions)
- Request correlation for audit trail
- Rate limiting maintained on all endpoints

### ✅ Audit Trail
- Admin audit endpoint for compliance investigations
- Organization-scoped query capabilities
- Metadata preservation for forensic analysis

## Test Coverage

### RBAC Policy Tests (`__tests__/rbac-policy.test.ts`)
- Role hierarchy validation (14 tests)
- Membership and permission checks
- Error handling scenarios

### Route Authorization Tests (`__tests__/routes-rbac.test.ts`) 
- Compute/export endpoint protection (8 tests)
- Role-based access validation
- Authentication requirements

### Admin Audit Tests (`__tests__/admin-audit.test.ts`)
- Authorization controls (13 tests)
- Query parameter validation
- Response format verification

**Total Test Coverage**: 35 tests ensuring authorization security

## Migration Impact

### ✅ Backward Compatible
- Existing API signatures maintained
- Progressive enhancement of authorization
- No breaking changes to client applications

### ✅ Production Ready
- Comprehensive error handling
- Request correlation for debugging
- Configurable rate limiting

## Bilingual Support
All error messages and audit actions remain language-agnostic, maintaining i18n compliance for the multilingual (EN/FR) application.

## Next Steps
This PR establishes the security foundation for:
- Organization invitation system
- Advanced audit analytics  
- Platform-level administration features

---

**Security Review**: ✅ All sensitive endpoints protected with role-aware authorization
**Compliance**: ✅ Least-privilege access controls implemented  
**Testing**: ✅ Comprehensive test coverage (35 tests)
**I18n**: ✅ Bilingual-safe implementation
