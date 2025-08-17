import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { act } from 'react-dom/test-utils'
import useCountUp from '@/components/hooks/useCountUp'

function HookWrapper({ to, durationMs }: { to: number; durationMs?: number }) {
  // simple wrapper to expose hook result
  const v = useCountUp({ to, durationMs });
  return <div role="status" aria-live="polite">{v}</div>
}

describe('useCountUp', () => {
  let originalMatchMedia: any

  beforeEach(() => {
    originalMatchMedia = (window as any).matchMedia
  })

  afterEach(() => {
    (window as any).matchMedia = originalMatchMedia
  })

  it('respects reduced motion and returns final value immediately', () => {
    (window as any).matchMedia = () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })
    render(<HookWrapper to={1234} />)
    const el = screen.getByRole('status')
    expect(el.textContent).toBe('1234')
  })

  it('animates to final value when reduced motion is off', async () => {
    (window as any).matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })
  render(<HookWrapper to={1000} durationMs={1000} />)
  // wait half the duration
  await new Promise((r) => setTimeout(r, 500))
  const statuses = screen.getAllByRole('status')
  const mid = parseInt(statuses[statuses.length - 1].textContent || '0', 10)
  expect(mid).toBeGreaterThan(0)
  expect(mid).toBeLessThanOrEqual(1000)

  // wait to finish
  await new Promise((r) => setTimeout(r, 700))
  const statusesFinal = screen.getAllByRole('status')
  const final = parseInt(statusesFinal[statusesFinal.length - 1].textContent || '0', 10)
  expect(final).toBe(1000)
  })
})
