import { NextRequest } from 'next/server'
import { GET } from '../../app/api/billing/entitlements/route'
import { loadEntitlementsForOrg, loadUsageForOrg } from '../../lib/billing/data'
import { deriveStatus } from '../../lib/billing/ui'
import type { BillingStatus, BillingEntitlements, BillingUsage } from '../../types/billing'

// Mock Prisma
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    billingCustomer: {
      findFirst: jest.fn(),
    },
    billingUsage: {
      findFirst: jest.fn(),
    },
  },
}))

describe('Billing Integration', () => {
  describe('Data Layer', () => {
    it('should load entitlements for an organization', async () => {
      const mockEntitlements: BillingEntitlements = {
        plan: 'business',
        reports: 100,
        teamSeats: 10,
        customBranding: true,
        apiAccess: true,
        priority_support: true,
        subscription_status: 'active',
        next_billing_date: '2025-02-01T00:00:00Z',
      }

      const entitlements = await loadEntitlementsForOrg('test-org-id')
      expect(entitlements).toBeDefined()
      expect(typeof entitlements.plan).toBe('string')
      expect(typeof entitlements.reports).toBe('number')
      expect(typeof entitlements.teamSeats).toBe('number')
    })

    it('should load usage for an organization', async () => {
      const usage = await loadUsageForOrg('test-org-id')
      expect(usage).toBeDefined()
      expect(typeof usage.reportsUsed).toBe('number')
      expect(typeof usage.seatsUsed).toBe('number')
    })
  })

  describe('Status Logic', () => {
    it('should derive correct billing status', () => {
      const entitlements: BillingEntitlements = {
        plan: 'business',
        reports: 100,
        teamSeats: 10,
        customBranding: true,
        apiAccess: true,
        priority_support: true,
        subscription_status: 'active',
        next_billing_date: '2025-02-01T00:00:00Z',
      }

      const usage: BillingUsage = {
        reportsUsed: 50,
        seatsUsed: 5,
      }

      const status = deriveStatus(entitlements, usage)
      expect(['ok', 'grace', 'frozen']).toContain(status)
    })
  })

  describe('API Endpoints', () => {
    it('should return entitlements from API', async () => {
      const request = new NextRequest('http://localhost:3000/api/billing/entitlements')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('plan')
      expect(data).toHaveProperty('reports')
      expect(data).toHaveProperty('teamSeats')
    })
  })
})
