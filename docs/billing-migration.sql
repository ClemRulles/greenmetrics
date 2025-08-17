-- Billing System Migration (PR #22)
-- Run this migration when ready to deploy billing features
-- This adds the billing tables to your existing database

-- Create billing-specific enums
CREATE TYPE "subscription_status" AS ENUM ('INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');
CREATE TYPE "plan_type" AS ENUM ('FREE', 'BASIC', 'PRO');

-- Core billing customer table
CREATE TABLE "billing_customers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "country_code" TEXT,
    "vat_id" TEXT,
    "address" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- Subscriptions with grace period support
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'INCOMPLETE',
    "plan" "plan_type" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "trial_end" TIMESTAMP(3),
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "in_grace_period" BOOLEAN NOT NULL DEFAULT false,
    "grace_period_end" TIMESTAMP(3),
    "frozen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Usage snapshots for billing calculations
CREATE TABLE "usage_snapshots" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "reports_generated" INTEGER NOT NULL DEFAULT 0,
    "exports_requested" INTEGER NOT NULL DEFAULT 0,
    "api_calls" INTEGER NOT NULL DEFAULT 0,
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "current_seats" INTEGER NOT NULL DEFAULT 0,
    "peak_seats" INTEGER NOT NULL DEFAULT 0,
    "snapshot_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- Entitlements and feature flags
CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quota" INTEGER,
    "used" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- Stripe event log for webhook idempotency
CREATE TABLE "stripe_event_log" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_event_log_pkey" PRIMARY KEY ("id")
);

-- Add billing customer relation to organizations
ALTER TABLE "organizations" ADD COLUMN "billing_customer_id" TEXT;

-- Create unique indexes
CREATE UNIQUE INDEX "billing_customers_organization_id_key" ON "billing_customers"("organization_id");
CREATE UNIQUE INDEX "billing_customers_stripe_customer_id_key" ON "billing_customers"("stripe_customer_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE UNIQUE INDEX "usage_snapshots_customer_id_period_key_key" ON "usage_snapshots"("customer_id", "period_key");
CREATE UNIQUE INDEX "entitlements_subscription_id_feature_key" ON "entitlements"("subscription_id", "feature");
CREATE UNIQUE INDEX "stripe_event_log_event_id_key" ON "stripe_event_log"("event_id");
CREATE UNIQUE INDEX "organizations_billing_customer_id_key" ON "organizations"("billing_customer_id");

-- Create performance indexes
CREATE INDEX "subscriptions_customer_id_idx" ON "subscriptions"("customer_id");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "usage_snapshots_customer_id_snapshot_at_idx" ON "usage_snapshots"("customer_id", "snapshot_at");
CREATE INDEX "entitlements_subscription_id_idx" ON "entitlements"("subscription_id");
CREATE INDEX "stripe_event_log_created_at_idx" ON "stripe_event_log"("created_at");

-- Add foreign key constraints
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usage_snapshots" ADD CONSTRAINT "usage_snapshots_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing_customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "billing_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
