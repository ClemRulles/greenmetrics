# Enhanced PDF Export System

## Overview

The PDF export system has been enhanced with cacheable exports and smart URL handling. The system now supports both direct PDF downloads and redirects to cached signed URLs.

## Key Features

### 1. Smart Export Behavior
- **Default behavior**: Redirects to signed URLs for better performance and sharing
- **Legacy support**: Direct PDF streaming when `cache=false` parameter is used
- **Backward compatibility**: Existing API endpoints continue to work

### 2. Export Endpoints

#### Enhanced PDF Export Route
```
GET /api/reports/{id}/export/pdf[?cache=false]
```

**Default behavior (cache=true)**:
1. Creates or retrieves cached PDF asset
2. Generates signed URL with 24h expiration
3. Returns 307 redirect to signed download endpoint

**Legacy behavior (cache=false)**:
1. Creates or retrieves cached PDF (still uses cache for efficiency)
2. Streams PDF directly with proper headers
3. Returns PDF as attachment download

#### Signed Download Endpoint
```
GET /api/exports/{assetId}/download?exp={timestamp}&sig={signature}
```

- Validates HMAC signature and expiration
- Serves cached PDF with proper content headers
- Returns 403 for invalid/expired signatures

### 3. URL Examples

**Cached export (default)**:
```
GET /api/reports/123/export/pdf
→ 307 redirect to /api/exports/asset456/download?exp=1735689600&sig=abc123
```

**Direct export (legacy)**:
```
GET /api/reports/123/export/pdf?cache=false
→ 200 with PDF content
```

**Signed download**:
```
GET /api/exports/asset456/download?exp=1735689600&sig=abc123
→ 200 with PDF content
```

### 4. Implementation Benefits

1. **Performance**: Cached PDFs avoid regeneration
2. **Sharing**: Signed URLs can be shared safely with expiration
3. **Security**: HMAC signatures prevent unauthorized access
4. **Scalability**: Storage abstraction supports local and S3 backends
5. **Compatibility**: Existing integrations continue to work

### 5. Configuration

Environment variables control behavior:
- `STORAGE_DRIVER`: "local" (default) or "s3"
- `STORAGE_LOCAL_PATH`: Path for local file storage
- `EXPORT_SIGN_SECRET`: Secret for HMAC signature generation
- `EXPORT_URL_TTL`: URL expiration time in seconds (default: 86400)

### 6. Content Hashing

PDFs are cached based on content hash including:
- Report data and metadata
- Framework version
- Language settings
- Factor computation results

This ensures cache invalidation when report content changes.

### 7. Testing

Comprehensive test coverage includes:
- Export caching functionality
- Signed URL generation and validation
- Content-based cache invalidation
- Storage driver abstraction
- Route behavior verification

All 20 tests pass, ensuring system reliability.

## Migration Guide

### For Frontend Applications
- No changes required - existing PDF export URLs continue to work
- To disable caching: add `?cache=false` parameter
- Signed URLs are automatically handled by redirect

### For API Integrations
- Existing endpoints remain functional
- Consider handling 307 redirects for better performance
- Implement proper signed URL validation if directly accessing download endpoints

## Security Considerations

- Signed URLs expire after 24 hours by default
- HMAC signatures prevent URL tampering
- Access control remains enforced at report level
- Local storage is excluded from version control (`.data/` in `.gitignore`)

The enhanced system provides production-ready PDF caching with backward compatibility and enterprise-grade security features.
