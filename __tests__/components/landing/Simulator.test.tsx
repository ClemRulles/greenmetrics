import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import Simulator from '@/components/landing/Simulator'

describe('Simulator', () => {
  it('renders inputs and result and updates on change', () => {
    render(<Simulator initialIntensity={0.5} initialUnits={2000} />)

    const intensity = screen.getByLabelText(/Intensity/i) as HTMLInputElement
    const units = screen.getByLabelText(/Units purchased/i) as HTMLInputElement
    const status = screen.getByRole('status')

    expect(intensity.value).toBe('0.5')
    expect(units.value).toBe('2000')
    expect(status).toHaveTextContent('1.00 tCO₂e')

    // change values
    fireEvent.change(intensity, { target: { value: '1.2' } })
    fireEvent.change(units, { target: { value: '1000' } })

    expect(status).toHaveTextContent('1.20 tCO₂e')
  })
})
