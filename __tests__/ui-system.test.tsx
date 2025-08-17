/**
 * UI System Tests - Component Library Validation
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import components to test
import { SectionHeader } from '@/components/ui/SectionHeader';
import { KPIStatCard } from '@/components/ui/KPIStatCard';
import { QualityDonut } from '@/components/ui/QualityDonut';
import { CoverageProgress } from '@/components/ui/CoverageProgress';
import { CertificateCard } from '@/components/ui/CertificateCard';

describe('GreenMetrics UI System', () => {
  describe('SectionHeader', () => {
    it('renders title and subtitle correctly', () => {
      render(
        <SectionHeader 
          title="Test Title" 
          subtitle="Test subtitle" 
          animate={false}
        />
      );
      
      expect(screen.getByRole('heading', { name: 'Test Title' })).toBeInTheDocument();
      expect(screen.getByText('Test subtitle')).toBeInTheDocument();
    });

    it('renders action element when provided', () => {
      render(
        <SectionHeader 
          title="Test Title" 
          action={<button>Action</button>}
          animate={false}
        />
      );
      
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('KPIStatCard', () => {
    it('displays KPI value and unit correctly', () => {
      render(
        <KPIStatCard
          title="Test KPI"
          value="1,234"
          unit="kg CO₂"
          animate={false}
        />
      );
      
      expect(screen.getByText('Test KPI')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
      expect(screen.getByText('kg CO₂')).toBeInTheDocument();
    });

    it('shows trend indicator when change is provided', () => {
      render(
        <KPIStatCard
          title="Test KPI"
          value="100"
          change={{ value: 12.5, period: 'vs last month', trend: 'up' }}
          animate={false}
        />
      );
      
      expect(screen.getByText('12.5%')).toBeInTheDocument();
      expect(screen.getByText('vs last month')).toBeInTheDocument();
    });
  });

  describe('QualityDonut', () => {
    const mockScores = [
      { label: 'Grade A', value: 50, color: '#16A34A' },
      { label: 'Grade B', value: 30, color: '#059669' },
      { label: 'Grade C', value: 20, color: '#D97706' },
    ];

    it('renders all score labels in legend', () => {
      render(
        <QualityDonut 
          scores={mockScores}
          animate={false}
        />
      );
      
      expect(screen.getByText('Grade A')).toBeInTheDocument();
      expect(screen.getByText('Grade B')).toBeInTheDocument();
      expect(screen.getByText('Grade C')).toBeInTheDocument();
    });

    it('displays percentages correctly', () => {
      render(
        <QualityDonut 
          scores={mockScores}
          animate={false}
        />
      );
      
      expect(screen.getByText('50.0%')).toBeInTheDocument();
      expect(screen.getByText('30.0%')).toBeInTheDocument();
      expect(screen.getByText('20.0%')).toBeInTheDocument();
    });
  });

  describe('CoverageProgress', () => {
    it('displays progress information correctly', () => {
      render(
        <CoverageProgress
          label="Test Coverage"
          current={75}
          target={100}
          unit="items"
          animate={false}
        />
      );
      
      expect(screen.getByText('Test Coverage')).toBeInTheDocument();
      expect(screen.getByText('75items')).toBeInTheDocument();
      expect(screen.getByText('/ 100items')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();
    });

    it('shows completion indicator when target is reached', () => {
      render(
        <CoverageProgress
          label="Complete Coverage"
          current={100}
          target={100}
          animate={false}
        />
      );
      
      expect(screen.getByText('Target reached')).toBeInTheDocument();
    });
  });

  describe('CertificateCard', () => {
    const mockCertificate = {
      id: '1',
      title: 'ISO 14001:2015',
      issuer: 'SGS',
      status: 'valid' as const,
      issuedAt: new Date('2024-01-15'),
      expiresAt: new Date('2025-01-15'),
      scope: 'Environmental Management',
      grade: 'A' as const,
    };

    it('displays certificate information correctly', () => {
      render(
        <CertificateCard
          certificate={mockCertificate}
          animate={false}
        />
      );
      
      expect(screen.getByText('ISO 14001:2015')).toBeInTheDocument();
      expect(screen.getByText('SGS')).toBeInTheDocument();
      expect(screen.getByText('Environmental Management')).toBeInTheDocument();
      expect(screen.getByText('Grade A')).toBeInTheDocument();
      expect(screen.getByText('Valid')).toBeInTheDocument();
    });

    it('shows download button when onDownload is provided', () => {
      const mockDownload = vi.fn();
      
      render(
        <CertificateCard
          certificate={mockCertificate}
          onDownload={mockDownload}
          animate={false}
        />
      );
      
      expect(screen.getByRole('button', { name: /download certificate/i })).toBeInTheDocument();
    });
  });
});

describe('Motion System', () => {
  it('should respect reduced motion preferences', () => {
    // Mock the media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(
      <KPIStatCard
        title="Test KPI"
        value="100"
        animate={true}
      />
    );

    // Component should render without errors when reduced motion is enabled
    expect(screen.getByText('Test KPI')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('provides proper ARIA labels for progress components', () => {
    render(
      <CoverageProgress
        label="Accessibility Test"
        current={50}
        target={100}
        animate={false}
      />
    );
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('supports keyboard navigation for interactive elements', () => {
    const mockClick = vi.fn();
    
    render(
      <KPIStatCard
        title="Interactive KPI"
        value="100"
        onClick={mockClick}
        animate={false}
      />
    );
    
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabIndex', '0');
  });
});
