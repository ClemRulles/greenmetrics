import { prisma } from '../lib/prisma';

const seedFactors = [
  // Electricity (kgCO2e per kWh)
  { kind: 'ELECTRICITY_KWH', unit: 'kWh', factorKgCO2ePerUnit: 0.057, geography: 'FR', source: 'ADEME 2024', validFrom: '2024-01-01', version: 'v2024.1' },
  { kind: 'ELECTRICITY_KWH', unit: 'kWh', factorKgCO2ePerUnit: 0.170, geography: 'BE', source: 'EEA 2024',   validFrom: '2024-01-01', version: 'v2024.1' },
  { kind: 'ELECTRICITY_KWH', unit: 'kWh', factorKgCO2ePerUnit: 0.348, geography: 'EU', source: 'EEA 2024',   validFrom: '2024-01-01', version: 'v2024.1' },

  // Diesel (kgCO2e per liter)
  { kind: 'FUEL_L', unit: 'L', factorKgCO2ePerUnit: 2.68, geography: 'EU', source: 'EEA 2024', validFrom: '2024-01-01', version: 'v2024.1' },

  // Waste (kgCO2e per tonne) — placeholder generic municipal waste
  { kind: 'WASTE_TONNES', unit: 't', factorKgCO2ePerUnit: 100.0, geography: 'EU', source: 'Generic 2024', validFrom: '2024-01-01', version: 'v2024.1' },

  // Travel (kgCO2e per km) — generic car
  { kind: 'TRAVEL_KM', unit: 'km', factorKgCO2ePerUnit: 0.180, geography: 'EU', source: 'EEA 2024', validFrom: '2024-01-01', version: 'v2024.1' },
] as const;

async function main() {
  for (const f of seedFactors) {
    await prisma.emissionFactor.upsert({
      where: {
        // uniqueness by tuple could be enforced by compound unique in a later migration if desired
        id: `${f.kind}-${f.geography}-${f.version}`.toLowerCase(),
      } as any,
      update: {},
      create: {
        kind: f.kind as any,
        unit: f.unit,
        factorKgCO2ePerUnit: f.factorKgCO2ePerUnit,
        geography: f.geography,
        source: f.source,
        validFrom: new Date(f.validFrom),
        version: f.version,
        // allow open-ended validTo
      },
    });
  }
  console.log('Seeded emission factors:', seedFactors.length);
}

main().catch((e) => {
  console.error('Factor seeding failed (is DB running?)', e);
  process.exit(0); // make safe in dev
}).finally(async () => {
  await prisma.$disconnect();
});
