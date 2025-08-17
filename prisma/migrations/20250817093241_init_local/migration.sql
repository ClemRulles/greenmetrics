-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('DRAFT', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ActivityKind" AS ENUM ('ELECTRICITY_KWH', 'FUEL_L', 'WASTE_TONNES', 'TRAVEL_KM');

-- CreateEnum
CREATE TYPE "public"."DSRType" AS ENUM ('EXPORT', 'DELETE');

-- CreateEnum
CREATE TYPE "public"."DSRStatus" AS ENUM ('RECEIVED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ExportStatus" AS ENUM ('READY', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."SharingVisibility" AS ENUM ('AGGREGATED', 'DETAILED');

-- CreateEnum
CREATE TYPE "public"."ConsentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ProofKind" AS ENUM ('ELECTRICITY_BILL', 'GAS_BILL', 'FUEL_INVOICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING');

-- CreateEnum
CREATE TYPE "public"."PlanType" AS ENUM ('FREE', 'BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "public"."DocumentSource" AS ENUM ('CSV', 'EMAIL', 'DRIVE');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('PENDING', 'PARSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."MeterType" AS ENUM ('ELECTRICITY', 'GAS', 'FUEL');

-- CreateEnum
CREATE TYPE "public"."ComputationType" AS ENUM ('LB', 'MB');

-- CreateEnum
CREATE TYPE "public"."QualityGrade" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "public"."IntensityLevel" AS ENUM ('SITE', 'FAMILY');

-- CreateEnum
CREATE TYPE "public"."CadenceStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."memberships" (
    "id" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "framework" TEXT NOT NULL,
    "frameworkVersion" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "geography" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."activity_records" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "kind" "public"."ActivityKind" NOT NULL,
    "unit" TEXT NOT NULL,
    "value" DECIMAL(20,6) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emission_factors" (
    "id" TEXT NOT NULL,
    "kind" "public"."ActivityKind" NOT NULL,
    "unit" TEXT NOT NULL,
    "factorKgCO2ePerUnit" DECIMAL(20,9) NOT NULL,
    "geography" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "version" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emission_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emission_factor_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "license" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emission_factor_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."factor_import_jobs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inserted" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "factor_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."emission_factor_overrides" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "geography" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "factorKgCO2ePerUnit" DECIMAL(20,9) NOT NULL,
    "version" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emission_factor_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."computation_traces" (
    "id" TEXT NOT NULL,
    "readingId" TEXT NOT NULL,
    "emissionFactorId" TEXT NOT NULL,
    "documentId" TEXT,
    "pageNumber" INTEGER,
    "computationType" "public"."ComputationType" NOT NULL,
    "intensity" DECIMAL(20,9),
    "attribution" DECIMAL(20,6),
    "grade" "public"."QualityGrade" NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "computation_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dsr_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."DSRType" NOT NULL,
    "status" "public"."DSRStatus" NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "dsr_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "orgId" TEXT,
    "action" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invitations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "locale" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."export_assets" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "storageDriver" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'application/pdf',
    "bytes" INTEGER NOT NULL,
    "framework" TEXT NOT NULL,
    "frameworkVersion" TEXT NOT NULL,
    "factorsVersion" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."export_jobs" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" "public"."ExportStatus" NOT NULL DEFAULT 'READY',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_totals_snapshots" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "scope1Kg" DECIMAL(20,9) NOT NULL,
    "scope2Kg" DECIMAL(20,9) NOT NULL,
    "totalKg" DECIMAL(20,9) NOT NULL,
    "factorsVersion" TEXT NOT NULL,
    "frameworkVersion" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_totals_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."partner_supplier_links" (
    "id" TEXT NOT NULL,
    "partnerOrgId" TEXT NOT NULL,
    "supplierOrgId" TEXT NOT NULL,
    "spendShare" DECIMAL(5,4) NOT NULL,
    "critical" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_supplier_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."partner_sharing_policies" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "visibilityDefault" "public"."SharingVisibility" NOT NULL DEFAULT 'AGGREGATED',
    "consentRequired" BOOLEAN NOT NULL DEFAULT true,
    "termsVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_sharing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_consents" (
    "id" TEXT NOT NULL,
    "partnerOrgId" TEXT NOT NULL,
    "supplierOrgId" TEXT NOT NULL,
    "status" "public"."ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "policyVersion" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coverage_snapshots" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invited" INTEGER NOT NULL,
    "active" INTEGER NOT NULL,
    "primaryData" INTEGER NOT NULL,
    "estimatedData" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coverage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."certificates" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "reportId" TEXT,
    "supplierOrgId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "scope1Kg" DECIMAL(18,3) NOT NULL,
    "scope2LBKg" DECIMAL(18,3) NOT NULL,
    "scope2MBKg" DECIMAL(18,3) NOT NULL,
    "intensityPerUnitKg" DECIMAL(18,6) NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "units" DECIMAL(18,3) NOT NULL,
    "factorsVersion" TEXT NOT NULL,
    "frameworkVersion" TEXT NOT NULL,
    "qualityGrade" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."partner_volume_allocations" (
    "id" TEXT NOT NULL,
    "supplierOrgId" TEXT NOT NULL,
    "partnerOrgId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "units" DECIMAL(18,3),
    "sharePct" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_volume_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."production_stats" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "units" DECIMAL(18,3) NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."proofs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "public"."ProofKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256Hex" VARCHAR(64) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "storedAt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attestations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreedBy" TEXT NOT NULL,
    "agreedIp" TEXT,
    "periodYear" INTEGER NOT NULL,
    "certificateId" TEXT,

    CONSTRAINT "attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."partner_targets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "coveragePct" INTEGER NOT NULL,
    "dqsMin" TEXT NOT NULL,
    "targetTons" DOUBLE PRECISION NOT NULL,
    "baselineYear" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."partner_target_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "atUtc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coveragePct" DOUBLE PRECISION NOT NULL,
    "dqsAvg" DOUBLE PRECISION NOT NULL,
    "attributedTons" DOUBLE PRECISION NOT NULL,
    "deltaTons" DOUBLE PRECISION NOT NULL,
    "onTrack" BOOLEAN NOT NULL,

    CONSTRAINT "partner_target_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_customers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "countryCode" TEXT,
    "vatId" TEXT,
    "address" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "planType" "public"."PlanType" NOT NULL DEFAULT 'FREE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "inGracePeriod" BOOLEAN NOT NULL DEFAULT false,
    "gracePeriodEnd" TIMESTAMP(3),
    "frozenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."entitlements" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "limit" INTEGER,
    "used" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."usage_snapshots" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "reportsGenerated" INTEGER NOT NULL DEFAULT 0,
    "exportsRequested" INTEGER NOT NULL DEFAULT 0,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,
    "storageUsedBytes" BIGINT NOT NULL DEFAULT 0,
    "currentSeats" INTEGER NOT NULL DEFAULT 0,
    "peakSeats" INTEGER NOT NULL DEFAULT 0,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stripe_event_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB,

    CONSTRAINT "stripe_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "source" "public"."DocumentSource" NOT NULL,
    "sha256" TEXT NOT NULL,
    "invoiceNo" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "meterType" "public"."MeterType" NOT NULL,
    "unit" TEXT NOT NULL,
    "pages" JSONB NOT NULL DEFAULT '[]',
    "storageKey" TEXT NOT NULL,
    "parsedAt" TIMESTAMP(3),
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."readings" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "unit" TEXT NOT NULL,
    "value" DECIMAL(20,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."intensity_records" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "familyId" TEXT,
    "level" "public"."IntensityLevel" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "scope1Emissions" DECIMAL(20,6) NOT NULL,
    "scope2Emissions" DECIMAL(20,6) NOT NULL,
    "unitsProduced" DECIMAL(20,6) NOT NULL,
    "intensity" DECIMAL(20,9) NOT NULL,
    "grade" "public"."QualityGrade" NOT NULL,
    "supportingDocs" JSONB NOT NULL DEFAULT '[]',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "intensity_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recomputation_jobs" (
    "id" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "affectedIds" JSONB NOT NULL DEFAULT '[]',
    "errors" JSONB DEFAULT '[]',
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "recomputation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."proof_documents" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "proofType" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "renewable" BOOLEAN NOT NULL DEFAULT false,
    "marketBased" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proof_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."monthly_emissions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monthPeriod" TEXT NOT NULL,
    "scope1Total" DECIMAL(15,4) NOT NULL,
    "scope2Total" DECIMAL(15,4) NOT NULL,
    "totalEmissions" DECIMAL(15,4) NOT NULL,
    "qualityGrade" "public"."QualityGrade" NOT NULL,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    "estimationMethod" TEXT,
    "dataCompleteness" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_emissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."monthly_production" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monthPeriod" TEXT NOT NULL,
    "productFamily" TEXT NOT NULL,
    "productionVolume" DECIMAL(15,4) NOT NULL,
    "productionUnit" TEXT NOT NULL,
    "intensity" DECIMAL(15,8),
    "intensityLevel" "public"."IntensityLevel" NOT NULL,
    "qualityGrade" "public"."QualityGrade" NOT NULL,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    "estimationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_production_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."buyer_attribution_monthly" (
    "id" TEXT NOT NULL,
    "buyerOrgId" TEXT NOT NULL,
    "supplierOrgId" TEXT NOT NULL,
    "monthPeriod" TEXT NOT NULL,
    "productFamily" TEXT NOT NULL,
    "purchasedVolume" DECIMAL(15,4) NOT NULL,
    "attributedEmissions" DECIMAL(15,4) NOT NULL,
    "attributionMethod" TEXT NOT NULL,
    "confidenceScore" DECIMAL(5,2) NOT NULL,
    "qualityGrade" "public"."QualityGrade" NOT NULL,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    "estimationMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_attribution_monthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dashboard_snapshots" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "monthPeriod" TEXT NOT NULL,
    "totalEmissions" DECIMAL(15,4) NOT NULL,
    "scope1Emissions" DECIMAL(15,4) NOT NULL,
    "scope2Emissions" DECIMAL(15,4) NOT NULL,
    "scope3Emissions" DECIMAL(15,4),
    "avgQualityGrade" TEXT NOT NULL,
    "dataCompleteness" DECIMAL(5,2) NOT NULL,
    "estimatedPercentage" DECIMAL(5,2) NOT NULL,
    "ytdEmissions" DECIMAL(15,4) NOT NULL,
    "trailing12Months" DECIMAL(15,4) NOT NULL,
    "vsTargetStatus" TEXT NOT NULL,
    "vsTargetPercentage" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cadence_jobs" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "monthPeriod" TEXT NOT NULL,
    "status" "public"."CadenceStatus" NOT NULL DEFAULT 'PENDING',
    "organizationId" TEXT,
    "affectedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "processingTimeMs" INTEGER,
    "errorDetails" JSONB,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cadence_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "public"."organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_organizationId_key" ON "public"."memberships"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "reports_organizationId_createdAt_idx" ON "public"."reports"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_records_reportId_idx" ON "public"."activity_records"("reportId");

-- CreateIndex
CREATE INDEX "emission_factors_kind_geography_validFrom_validTo_idx" ON "public"."emission_factors"("kind", "geography", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "emission_factor_overrides_organizationId_kind_validFrom_idx" ON "public"."emission_factor_overrides"("organizationId", "kind", "validFrom");

-- CreateIndex
CREATE INDEX "computation_traces_readingId_idx" ON "public"."computation_traces"("readingId");

-- CreateIndex
CREATE INDEX "computation_traces_emissionFactorId_idx" ON "public"."computation_traces"("emissionFactorId");

-- CreateIndex
CREATE INDEX "computation_traces_documentId_idx" ON "public"."computation_traces"("documentId");

-- CreateIndex
CREATE INDEX "computation_traces_computationType_grade_idx" ON "public"."computation_traces"("computationType", "grade");

-- CreateIndex
CREATE INDEX "computation_traces_computedAt_idx" ON "public"."computation_traces"("computedAt");

-- CreateIndex
CREATE INDEX "dsr_requests_userId_type_createdAt_idx" ON "public"."dsr_requests"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "public"."audit_logs"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "public"."invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_orgId_email_status_idx" ON "public"."invitations"("orgId", "email", "status");

-- CreateIndex
CREATE UNIQUE INDEX "export_assets_hash_key" ON "public"."export_assets"("hash");

-- CreateIndex
CREATE INDEX "export_assets_reportId_createdAt_idx" ON "public"."export_assets"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_reportId_createdAt_idx" ON "public"."export_jobs"("reportId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "report_totals_snapshots_reportId_key" ON "public"."report_totals_snapshots"("reportId");

-- CreateIndex
CREATE INDEX "partner_supplier_links_partnerOrgId_idx" ON "public"."partner_supplier_links"("partnerOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_supplier_links_partnerOrgId_supplierOrgId_key" ON "public"."partner_supplier_links"("partnerOrgId", "supplierOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "partner_sharing_policies_orgId_key" ON "public"."partner_sharing_policies"("orgId");

-- CreateIndex
CREATE INDEX "supplier_consents_partnerOrgId_idx" ON "public"."supplier_consents"("partnerOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_consents_partnerOrgId_supplierOrgId_key" ON "public"."supplier_consents"("partnerOrgId", "supplierOrgId");

-- CreateIndex
CREATE INDEX "coverage_snapshots_orgId_at_idx" ON "public"."coverage_snapshots"("orgId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_publicId_key" ON "public"."certificates"("publicId");

-- CreateIndex
CREATE INDEX "certificates_supplierOrgId_periodStart_periodEnd_idx" ON "public"."certificates"("supplierOrgId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "certificates_reportId_idx" ON "public"."certificates"("reportId");

-- CreateIndex
CREATE INDEX "partner_volume_allocations_partnerOrgId_year_idx" ON "public"."partner_volume_allocations"("partnerOrgId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "partner_volume_allocations_supplierOrgId_partnerOrgId_year_key" ON "public"."partner_volume_allocations"("supplierOrgId", "partnerOrgId", "year");

-- CreateIndex
CREATE INDEX "production_stats_organizationId_year_idx" ON "public"."production_stats"("organizationId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "production_stats_organizationId_year_key" ON "public"."production_stats"("organizationId", "year");

-- CreateIndex
CREATE INDEX "proofs_organizationId_periodStart_periodEnd_idx" ON "public"."proofs"("organizationId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "proofs_organizationId_kind_idx" ON "public"."proofs"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "proofs_organizationId_sha256Hex_key" ON "public"."proofs"("organizationId", "sha256Hex");

-- CreateIndex
CREATE INDEX "attestations_organizationId_periodYear_idx" ON "public"."attestations"("organizationId", "periodYear");

-- CreateIndex
CREATE UNIQUE INDEX "partner_targets_organizationId_key" ON "public"."partner_targets"("organizationId");

-- CreateIndex
CREATE INDEX "partner_target_snapshots_organizationId_atUtc_idx" ON "public"."partner_target_snapshots"("organizationId", "atUtc");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_organizationId_key" ON "public"."billing_customers"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_stripeCustomerId_key" ON "public"."billing_customers"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "public"."subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_customerId_status_idx" ON "public"."subscriptions"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_subscriptionId_feature_key" ON "public"."entitlements"("subscriptionId", "feature");

-- CreateIndex
CREATE INDEX "usage_snapshots_customerId_snapshotAt_idx" ON "public"."usage_snapshots"("customerId", "snapshotAt");

-- CreateIndex
CREATE UNIQUE INDEX "usage_snapshots_customerId_periodKey_key" ON "public"."usage_snapshots"("customerId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "stripe_event_logs_eventId_key" ON "public"."stripe_event_logs"("eventId");

-- CreateIndex
CREATE INDEX "stripe_event_logs_eventId_idx" ON "public"."stripe_event_logs"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "documents_sha256_key" ON "public"."documents"("sha256");

-- CreateIndex
CREATE INDEX "documents_supplierId_source_idx" ON "public"."documents"("supplierId", "source");

-- CreateIndex
CREATE INDEX "documents_status_createdAt_idx" ON "public"."documents"("status", "createdAt");

-- CreateIndex
CREATE INDEX "documents_sha256_idx" ON "public"."documents"("sha256");

-- CreateIndex
CREATE INDEX "readings_documentId_idx" ON "public"."readings"("documentId");

-- CreateIndex
CREATE INDEX "readings_siteId_month_idx" ON "public"."readings"("siteId", "month");

-- CreateIndex
CREATE INDEX "readings_month_unit_idx" ON "public"."readings"("month", "unit");

-- CreateIndex
CREATE INDEX "intensity_records_siteId_periodStart_idx" ON "public"."intensity_records"("siteId", "periodStart");

-- CreateIndex
CREATE INDEX "intensity_records_familyId_periodStart_idx" ON "public"."intensity_records"("familyId", "periodStart");

-- CreateIndex
CREATE INDEX "intensity_records_level_grade_idx" ON "public"."intensity_records"("level", "grade");

-- CreateIndex
CREATE INDEX "intensity_records_computedAt_idx" ON "public"."intensity_records"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "intensity_records_siteId_familyId_level_periodStart_periodE_key" ON "public"."intensity_records"("siteId", "familyId", "level", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "recomputation_jobs_status_startedAt_idx" ON "public"."recomputation_jobs"("status", "startedAt");

-- CreateIndex
CREATE INDEX "recomputation_jobs_entityType_entityId_idx" ON "public"."recomputation_jobs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "recomputation_jobs_triggerType_idx" ON "public"."recomputation_jobs"("triggerType");

-- CreateIndex
CREATE INDEX "proof_documents_documentId_idx" ON "public"."proof_documents"("documentId");

-- CreateIndex
CREATE INDEX "proof_documents_proofType_verified_idx" ON "public"."proof_documents"("proofType", "verified");

-- CreateIndex
CREATE INDEX "proof_documents_validFrom_validTo_idx" ON "public"."proof_documents"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "proof_documents_renewable_marketBased_idx" ON "public"."proof_documents"("renewable", "marketBased");

-- CreateIndex
CREATE INDEX "monthly_emissions_monthPeriod_idx" ON "public"."monthly_emissions"("monthPeriod");

-- CreateIndex
CREATE INDEX "monthly_emissions_qualityGrade_isEstimated_idx" ON "public"."monthly_emissions"("qualityGrade", "isEstimated");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_emissions_organizationId_monthPeriod_key" ON "public"."monthly_emissions"("organizationId", "monthPeriod");

-- CreateIndex
CREATE INDEX "monthly_production_monthPeriod_productFamily_idx" ON "public"."monthly_production"("monthPeriod", "productFamily");

-- CreateIndex
CREATE INDEX "monthly_production_qualityGrade_isEstimated_idx" ON "public"."monthly_production"("qualityGrade", "isEstimated");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_production_organizationId_monthPeriod_productFamily_key" ON "public"."monthly_production"("organizationId", "monthPeriod", "productFamily");

-- CreateIndex
CREATE INDEX "buyer_attribution_monthly_monthPeriod_productFamily_idx" ON "public"."buyer_attribution_monthly"("monthPeriod", "productFamily");

-- CreateIndex
CREATE INDEX "buyer_attribution_monthly_qualityGrade_isEstimated_idx" ON "public"."buyer_attribution_monthly"("qualityGrade", "isEstimated");

-- CreateIndex
CREATE UNIQUE INDEX "buyer_attribution_monthly_buyerOrgId_supplierOrgId_monthPer_key" ON "public"."buyer_attribution_monthly"("buyerOrgId", "supplierOrgId", "monthPeriod", "productFamily");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_monthPeriod_idx" ON "public"."dashboard_snapshots"("monthPeriod");

-- CreateIndex
CREATE INDEX "dashboard_snapshots_vsTargetStatus_idx" ON "public"."dashboard_snapshots"("vsTargetStatus");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_snapshots_organizationId_monthPeriod_key" ON "public"."dashboard_snapshots"("organizationId", "monthPeriod");

-- CreateIndex
CREATE INDEX "cadence_jobs_jobType_status_idx" ON "public"."cadence_jobs"("jobType", "status");

-- CreateIndex
CREATE INDEX "cadence_jobs_monthPeriod_status_idx" ON "public"."cadence_jobs"("monthPeriod", "status");

-- CreateIndex
CREATE INDEX "cadence_jobs_organizationId_jobType_idx" ON "public"."cadence_jobs"("organizationId", "jobType");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reports" ADD CONSTRAINT "reports_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_records" ADD CONSTRAINT "activity_records_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."factor_import_jobs" ADD CONSTRAINT "factor_import_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."emission_factor_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."emission_factor_overrides" ADD CONSTRAINT "emission_factor_overrides_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."computation_traces" ADD CONSTRAINT "computation_traces_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "public"."readings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."computation_traces" ADD CONSTRAINT "computation_traces_emissionFactorId_fkey" FOREIGN KEY ("emissionFactorId") REFERENCES "public"."emission_factors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."computation_traces" ADD CONSTRAINT "computation_traces_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dsr_requests" ADD CONSTRAINT "dsr_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."export_assets" ADD CONSTRAINT "export_assets_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."export_jobs" ADD CONSTRAINT "export_jobs_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_totals_snapshots" ADD CONSTRAINT "report_totals_snapshots_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."partner_supplier_links" ADD CONSTRAINT "partner_supplier_links_partnerOrgId_fkey" FOREIGN KEY ("partnerOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."partner_supplier_links" ADD CONSTRAINT "partner_supplier_links_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."partner_sharing_policies" ADD CONSTRAINT "partner_sharing_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."supplier_consents" ADD CONSTRAINT "supplier_consents_partnerOrgId_fkey" FOREIGN KEY ("partnerOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."supplier_consents" ADD CONSTRAINT "supplier_consents_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coverage_snapshots" ADD CONSTRAINT "coverage_snapshots_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."certificates" ADD CONSTRAINT "certificates_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."partner_volume_allocations" ADD CONSTRAINT "partner_volume_allocations_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."partner_volume_allocations" ADD CONSTRAINT "partner_volume_allocations_partnerOrgId_fkey" FOREIGN KEY ("partnerOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."production_stats" ADD CONSTRAINT "production_stats_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proofs" ADD CONSTRAINT "proofs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attestations" ADD CONSTRAINT "attestations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."partner_targets" ADD CONSTRAINT "partner_targets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."partner_target_snapshots" ADD CONSTRAINT "partner_target_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_customers" ADD CONSTRAINT "billing_customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."entitlements" ADD CONSTRAINT "entitlements_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."usage_snapshots" ADD CONSTRAINT "usage_snapshots_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."readings" ADD CONSTRAINT "readings_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."proof_documents" ADD CONSTRAINT "proof_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."monthly_emissions" ADD CONSTRAINT "monthly_emissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."monthly_production" ADD CONSTRAINT "monthly_production_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."buyer_attribution_monthly" ADD CONSTRAINT "buyer_attribution_monthly_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."buyer_attribution_monthly" ADD CONSTRAINT "buyer_attribution_monthly_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cadence_jobs" ADD CONSTRAINT "cadence_jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
