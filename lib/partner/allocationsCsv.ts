import { z } from 'zod';

export const AllocationRow = z.object({
  supplierSlug: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  units: z.coerce.number().nonnegative().optional(),
  sharePct: z.coerce.number().min(0).max(1).optional()
}).refine(r => r.units !== undefined || r.sharePct !== undefined, {
  message: 'Either units or sharePct is required'
});

export type AllocationRowType = z.infer<typeof AllocationRow>;

export function parseAllocationsCsv(csv: string): AllocationRowType[] {
  const rows = csv.trim().split(/\r?\n/);
  const header = rows.shift() ?? '';
  const cols = header.split(',').map(s => s.trim());
  const idx = (k: string) => cols.indexOf(k);

  // Required columns
  const required = ['supplierSlug', 'year'];
  for (const k of required) {
    if (idx(k) < 0) {
      throw new Error(`Missing required column: ${k}`);
    }
  }

  const results: AllocationRowType[] = [];
  let lineNumber = 2; // Start from 2 since we skipped header

  for (const line of rows) {
    if (!line.trim()) continue; // Skip empty lines
    
    try {
      const parts = line.split(',').map(s => s.trim());
      
      const obj = {
        supplierSlug: parts[idx('supplierSlug')] || '',
        year: parts[idx('year')] || '',
        units: idx('units') >= 0 ? parts[idx('units')] : undefined,
        sharePct: idx('sharePct') >= 0 ? parts[idx('sharePct')] : undefined
      };

      const parsed = AllocationRow.parse(obj);
      results.push(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(i => i.message).join(', ');
        throw new Error(`Line ${lineNumber}: ${issues}`);
      }
      throw new Error(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Parse error'}`);
    }
    
    lineNumber++;
  }

  return results;
}

export function validateCsvHeader(csv: string): { valid: boolean; error?: string; columns?: string[] } {
  const firstLine = csv.trim().split(/\r?\n/)[0];
  if (!firstLine) {
    return { valid: false, error: 'Empty CSV file' };
  }

  const columns = firstLine.split(',').map(s => s.trim());
  const required = ['supplierSlug', 'year'];
  const missing = required.filter(col => !columns.includes(col));

  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `Missing required columns: ${missing.join(', ')}`,
      columns 
    };
  }

  return { valid: true, columns };
}
