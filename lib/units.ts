type Unit = string;
type Kind = 'ELECTRICITY_KWH' | 'FUEL_L' | 'WASTE_TONNES' | 'TRAVEL_KM';

const identityUnits: Record<Kind, Unit> = {
  ELECTRICITY_KWH: 'kWh',
  FUEL_L: 'L',
  WASTE_TONNES: 't',
  TRAVEL_KM: 'km',
};

// For MVP we assume input units match factor units. Extend here for conversions.
export function normalizeUnit(kind: Kind, unit: string): { unit: Unit; note?: string } {
  const expected = identityUnits[kind];
  if (unit === expected) return { unit };
  // Add conversions when needed, and return a note for the trace
  return { unit: expected, note: `Converted from ${unit} to ${expected} (MVP placeholder)` };
}
