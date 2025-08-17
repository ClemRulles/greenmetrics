"use client";

import React from 'react'
import ReducedMotionGate from '@/components/motion/ReducedMotionGate'

type Props = {
  initialIntensity?: number
  initialUnits?: number
}

export default function Simulator({ initialIntensity = 0.12, initialUnits = 1000 }: Props) {
  const [intensity, setIntensity] = React.useState(initialIntensity)
  const [units, setUnits] = React.useState(initialUnits)
  const result = React.useMemo(() => (intensity * units) / 1000, [intensity, units]) // tCO2e

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
      <div>
        <label htmlFor="intensity" className="block text-sm text-[var(--text-muted)] mb-1">Intensity (kgCO₂e / unit)</label>
        <input
          id="intensity"
          aria-describedby="intensity-help"
          type="number"
          step="0.01"
          value={intensity}
          onChange={(e) => setIntensity(parseFloat(e.target.value) || 0)}
          className="w-full rounded border p-2"
        />
        <p id="intensity-help" className="text-xs text-[var(--text-muted)] mt-1">Enter carbon intensity per unit in kgCO₂e.</p>
      </div>
      <div>
        <label htmlFor="units" className="block text-sm text-[var(--text-muted)] mb-1">Units purchased</label>
        <input
          id="units"
          aria-describedby="units-help"
          type="number"
          value={units}
          onChange={(e) => setUnits(parseInt(e.target.value) || 0)}
          className="w-full rounded border p-2"
        />
        <p id="units-help" className="text-xs text-[var(--text-muted)] mt-1">Number of units bought in the transaction.</p>
      </div>
      <div className="bg-neutral-50 rounded p-4 text-center">
        <p className="text-sm text-[var(--text-muted)]">Attributed tCO₂e</p>
        <div role="status" aria-live="polite">
          <p className="text-2xl font-bold text-[var(--text-default)]">{result.toFixed(2)} tCO₂e</p>
        </div>
      </div>
    </div>
  )
}
