import { z } from 'zod';

export const reportCreateSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(2).max(120),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  framework: z.enum(['VSME-Basic', 'VSME-Comprehensive', 'ESRS-2+E1-min']).default('VSME-Basic'),
  frameworkVersion: z.string().min(1),
  language: z.enum(['en', 'fr']).default('en'),
});

export const activitySchema = z.object({
  kind: z.enum(['ELECTRICITY_KWH', 'FUEL_L', 'WASTE_TONNES', 'TRAVEL_KM']),
  unit: z.string().min(1),
  value: z.coerce.number().positive(),
  note: z.string().max(280).optional(),
});

export const activitiesBatchSchema = z.object({
  reportId: z.string().min(1),
  items: z.array(activitySchema).min(1).max(500),
});
