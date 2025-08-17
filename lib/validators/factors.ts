import { z } from 'zod';

export const FactorRecord = z.object({
  kind: z.string().min(1),
  unit: z.string().min(1),
  geography: z.string().length(2).optional(), // ISO2, validated elsewhere
  factorKgCO2ePerUnit: z.number().positive(),
  source: z.string().min(1).optional(),
  validFrom: z.string().or(z.date()),
  validTo: z.string().or(z.date()).optional(),
  version: z.string().min(1)
});

export const FactorImportPayload = z.object({
  source: z.object({ 
    name: z.string().min(1), 
    url: z.string().url().optional(), 
    license: z.string().optional() 
  }),
  version: z.string().min(1),
  factors: z.array(FactorRecord).min(1)
});

export const OverridePayload = z.object({
  kind: z.string().min(1),
  unit: z.string().min(1),
  geography: z.string().length(2).optional(),
  validFrom: z.string().or(z.date()),
  validTo: z.string().or(z.date()).optional(),
  factorKgCO2ePerUnit: z.number().positive(),
  version: z.string().min(1),
  reason: z.string().optional()
});

export const ResolveQuery = z.object({
  kind: z.string().min(1),
  date: z.string().min(1),
  geo: z.string().length(2).optional(),
  orgId: z.string().optional()
});
