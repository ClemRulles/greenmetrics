## PR #36 — Ingestion v1: Email/Drive/CSV → Readings (kWh/m³/L) with Idempotency

### 🎯 **Objective**
Implement comprehensive data ingestion pipeline for utility readings from multiple sources (CSV, email, Google Drive) with deduplication, parsing, and privacy-first architecture.

### 🏗️ **What to Build**

#### **Data Models**
```typescript
// Document model for source files
interface Document {
  id: string;
  supplierId: string;
  source: 'email' | 'drive' | 'csv';
  sha256: string;
  invoiceNo?: string;
  periodStart: Date;
  periodEnd: Date;
  meterType: 'electricity' | 'gas' | 'fuel';
  unit: string;
  pages: string[];
  storageKey: string;
  parsedAt?: Date;
  status: 'pending' | 'parsing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// Reading model for utility consumption data
interface Reading {
  id: string;
  documentId: string;
  siteId: string;
  month: Date;
  unit: string;
  value: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### **Anti-Duplicate Strategy**
- **SHA256 Hash**: `sha256(content + supplierId + invoiceNo + periodMonth)`
- **Unique Constraint**: Prevents duplicate document ingestion
- **Idempotent Endpoints**: All ingestion routes return existing records for duplicates

#### **Ingestion Endpoints**
1. **CSV Upload** (`POST /api/ingest/csv`)
   - Schema: `supplierSlug,site,year,month,meterType,unit,value,invoiceNo?`
   - Immediate processing and Reading creation
   - Bulk import with validation

2. **Email Webhook** (`POST /api/ingest/email`)
   - Inbound webhook for email processors
   - Template matching for common utilities
   - Secure storage with parse job queuing

3. **Google Drive Webhook** (`POST /api/ingest/drive`)
   - Google Drive file change notifications
   - File reference storage with metadata
   - Async parsing pipeline

#### **Parsing Pipeline**
- **v1 Deterministic**: Regex templates for common utility formats
- **OCR Fallback**: Behind feature flag (disabled by default)
- **Template Library**: Extensible patterns for major utility providers

### 📁 **Files to Create/Update**

#### **Database Schema**
1. **`prisma/migrations/add-ingestion-models.sql`** - Document and Reading tables
2. **`prisma/schema.prisma`** - Updated schema with ingestion models

#### **API Endpoints**
3. **`app/api/ingest/csv/route.ts`** - CSV upload and processing
4. **`app/api/ingest/email/route.ts`** - Email webhook handler
5. **`app/api/ingest/drive/route.ts`** - Google Drive webhook handler

#### **Core Libraries**
6. **`lib/ingestion/csv.ts`** - CSV parsing and validation
7. **`lib/ingestion/email.ts`** - Email processing and template matching
8. **`lib/ingestion/drive.ts`** - Google Drive integration
9. **`lib/ingestion/deduplication.ts`** - SHA256 hashing and duplicate detection
10. **`lib/ingestion/parsing.ts`** - Document parsing with templates
11. **`lib/ingestion/privacy.ts`** - Secure storage and access controls

#### **Templates & Patterns**
12. **`lib/ingestion/templates/electricity.ts`** - Electric utility patterns
13. **`lib/ingestion/templates/gas.ts`** - Gas utility patterns
14. **`lib/ingestion/templates/fuel.ts`** - Fuel supplier patterns

#### **Testing**
15. **`__tests__/ingestion/csv.test.ts`** - CSV ingestion testing
16. **`__tests__/ingestion/deduplication.test.ts`** - Duplicate detection
17. **`__tests__/ingestion/privacy.test.ts`** - Privacy and access controls
18. **`__tests__/ingestion/parsing.test.ts`** - Template parsing validation

### 🔒 **Privacy & Security**

#### **Proof Vault Storage**
- **Encrypted Storage**: All documents encrypted at rest
- **Access Controls**: Partner cannot access raw files or filenames
- **Aggregation Only**: Partners see only aggregated readings
- **Audit Trail**: Complete ingestion and access logging

#### **Data Flow**
```
Raw Document → SHA256 Hash → Duplicate Check → Secure Storage → 
Template Parsing → Reading Extraction → Aggregation → Partner Dashboard
```

### 🎯 **Acceptance Criteria**

#### **CSV Ingestion**
- [ ] CSV upload converts rows to Readings with Document links
- [ ] Schema validation with clear error messages
- [ ] Bulk processing with progress tracking
- [ ] Duplicate detection prevents re-processing

#### **Email & Drive Integration**
- [ ] Email webhook persists payload and enqueues parsing
- [ ] Google Drive webhook stores file reference with metadata
- [ ] Template matching for common utility formats
- [ ] Async parsing with status tracking

#### **Deduplication & Idempotency**
- [ ] SHA256 duplicate detection works across all sources
- [ ] Idempotent endpoints return existing records gracefully
- [ ] Invoice number conflicts handled appropriately
- [ ] Period overlap detection and resolution

#### **Privacy & Security**
- [ ] Partners see only aggregated data, never raw files
- [ ] Secure storage with encryption and access controls
- [ ] Audit logging for all ingestion activities
- [ ] Filename and content privacy maintained

### 🚀 **Implementation Priority**

**Phase 1: Core Infrastructure** (Day 1)
- Database models and migrations
- Deduplication and hashing utilities
- Basic CSV ingestion with validation

**Phase 2: Template Parsing** (Day 2)
- Regex templates for common utilities
- Document parsing pipeline
- Reading extraction and validation

**Phase 3: Webhook Integration** (Day 3)
- Email and Drive webhook handlers
- Async parsing queue implementation
- Privacy controls and secure storage

This establishes the foundation for automated utility data ingestion with enterprise-grade deduplication and privacy! 🔄
