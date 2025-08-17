# RBAC Security Runbook

## Role Hierarchy & Permissions

### Role Levels
| Role | Level | Description |
|------|-------|-------------|
| OWNER | 3 | Full organization control |
| ADMIN | 2 | Administrative access + audit |
| EDITOR | 1 | Content management |
| VIEWER | 0 | Read-only access |

### Permission Matrix
| Action | OWNER | ADMIN | EDITOR | VIEWER |
|--------|-------|-------|--------|--------|
| View Reports | ✅ | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ✅ | ✅ |
| Compute Reports | ✅ | ✅ | ✅ | ❌ |
| Manage Factors | ✅ | ✅ | ✅ | ❌ |
| Admin Audit | ✅ | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

## Security Endpoints

### Protected Routes
```typescript
// Compute - EDITOR+ required
POST /api/reports/[id]/compute

// Export - VIEWER+ allowed
GET /api/reports/[id]/export

// Factor Override - EDITOR+ required  
POST /api/factors/override

// Admin Audit - ADMIN+ required
GET /api/admin/audit?orgId=...
```

### Authorization Flow
1. **Authentication**: Verify NextAuth session
2. **User Validation**: Extract userId from session
3. **Membership Check**: Verify organization membership
4. **Permission Check**: Validate role meets minimum requirement
5. **Resource Access**: Grant/deny based on authorization

## Error Codes & Troubleshooting

### Common Errors
```typescript
// 401 UNAUTHORIZED - Missing/invalid auth
throw new Error('UNAUTHORIZED');

// 403 FORBIDDEN - Insufficient permissions
throw new Error('FORBIDDEN');  

// 422 VALIDATION - Missing parameters
{ error: 'VALIDATION', detail: 'orgId parameter is required' }
```

### Debugging Steps
1. **Check Authentication**: Verify NextAuth session exists
2. **Verify Membership**: Confirm user belongs to organization
3. **Check Role**: Validate role meets minimum requirement
4. **Audit Logs**: Review admin audit for access attempts

## Admin Operations

### Audit Query Examples
```bash
# Recent activity for organization
GET /api/admin/audit?orgId=org_123&limit=50

# Failed operations 
GET /api/admin/audit?orgId=org_123&action=export.failed

# Date range query
GET /api/admin/audit?orgId=org_123&from=2024-01-01&to=2024-01-31
```

### Response Format
```json
{
  "data": [
    {
      "id": "audit_123",
      "action": "compute.success", 
      "orgId": "org_123",
      "userId": "user_456",
      "targetId": "report_789",
      "metadata": { "duration": 450 },
      "createdAt": "2024-01-15T10:00:00Z",
      "requestId": "req_abc123"
    }
  ],
  "count": 1,
  "filters": { "orgId": "org_123", "limit": 50 }
}
```

## Security Best Practices

### Development
- ✅ Always call `requireUser()` first in API routes
- ✅ Use `requireOrgRole()` for membership validation
- ✅ Apply `canCompute()`/`canExport()` for resource access
- ✅ Include request correlation via `withRequestId()`

### Code Review Checklist
- [ ] Authentication check present?
- [ ] Minimum role requirement validated?
- [ ] Organization isolation enforced?
- [ ] Error handling covers auth failures?
- [ ] Tests verify authorization logic?

### Monitoring & Alerts
- Monitor failed authentication attempts (401s)
- Alert on privilege escalation attempts (403s)
- Track admin audit access patterns
- Review compute/export authorization failures

## Emergency Procedures

### Suspected Breach
1. **Review Audit Logs**: Check admin audit for unauthorized access
2. **Verify Memberships**: Audit user-organization relationships
3. **Check Role Changes**: Review recent role modifications
4. **Revoke Sessions**: Clear compromised user sessions

### Role Recovery
```sql
-- Emergency role assignment (database level)
UPDATE memberships 
SET role = 'ADMIN' 
WHERE userId = 'emergency_user' AND organizationId = 'affected_org';
```

### System Lockdown
- Disable authentication providers
- Require re-authentication for all users
- Enable enhanced audit logging
- Restrict to OWNER-only operations

## Compliance Notes

### Data Protection
- All audit queries are organization-scoped
- User data isolation enforced via membership
- Role-based access controls meet GDPR requirements

### Audit Trail
- Request correlation maintained across all operations
- Admin actions logged with full context
- Metadata preserved for compliance investigations

---

**Last Updated**: 2024-01-15  
**Review Cycle**: Quarterly  
**Owner**: Security Team
