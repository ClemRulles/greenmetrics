import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Hero from '@/components/landing/Hero'

describe('Hero', () => {
  it('renders hero with h1 and CTAs', () => {
    render(<Hero title="T" subtitle="S" primaryCta="A" secondaryCta="B" />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /A/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /B/i })).toBeInTheDocument()
  })
})
