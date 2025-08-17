const ISO2 = /^[A-Z]{2}$/;

export function normalizeGeography(input?: string | null): string | null {
  if (!input) return null;
  const v = input.toUpperCase().trim();
  return ISO2.test(v) ? v : null;
}

export function geographyForReport(
  report: { geography: string | null }, 
  org?: { countryCode: string | null }
): string {
  return normalizeGeography(report.geography) || 
         normalizeGeography(org?.countryCode) || 
         'EU';
}
