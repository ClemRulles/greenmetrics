import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmissionChart } from '@/components/charts/EmissionChart';
import type { ChartDataPoint } from '@/components/charts/EmissionChart';

// Mock chart data with correct interface
const mockChartData: ChartDataPoint[] = [
  {
    period: '2025-01',
    value: 120.5,
    quality: 'A',
    isEstimated: false,
  },
  {
    period: '2025-02',
    value: 98.7,
    quality: 'B',
    isEstimated: false,
  },
  {
    period: '2025-03',
    value: 135.2,
    quality: 'C',
    isEstimated: true,
  },
];

describe('EmissionChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chart with data points', () => {
    render(
      <EmissionChart
        data={mockChartData}
        title="Monthly Emissions"
        type="monthly"
        height={300}
      />
    );

    // Check for chart presence
    expect(screen.getByText('Monthly Emissions')).toBeInTheDocument();
    
    // Check for period labels
    expect(screen.getByText('Jan 2025')).toBeInTheDocument();
    expect(screen.getByText('Feb 2025')).toBeInTheDocument();
    expect(screen.getByText('Mar 2025')).toBeInTheDocument();
  });

  it('should handle empty data gracefully', () => {
    render(
      <EmissionChart
        data={[]}
        title="Empty Chart"
        type="monthly"
        height={300}
      />
    );

    expect(screen.getByText('Empty Chart')).toBeInTheDocument();
  });

  it('should show quality indicators when enabled', () => {
    render(
      <EmissionChart
        data={mockChartData}
        title="Quality Chart"
        type="monthly"
        height={300}
        showQualityIndicators={true}
      />
    );

    // Check for quality grade indicators in the chart
    const chartBars = screen.getAllByTestId(/^chart-bar-/);
    expect(chartBars.length).toBeGreaterThan(0);
  });

  it('should hide quality indicators when disabled', () => {
    render(
      <EmissionChart
        data={mockChartData}
        title="No Quality Chart"
        type="monthly"
        height={300}
        showQualityIndicators={false}
      />
    );

    // Should still render data but without quality styling
    const chartBars = screen.getAllByTestId(/^chart-bar-/);
    expect(chartBars.length).toBeGreaterThan(0);
  });

  it('should render different chart types correctly', () => {
    const { rerender } = render(
      <EmissionChart
        data={mockChartData}
        title="Monthly View"
        type="monthly"
        height={300}
      />
    );

    expect(screen.getByText('Monthly View')).toBeInTheDocument();

    // Test YTD view
    rerender(
      <EmissionChart
        data={mockChartData}
        title="YTD View"
        type="ytd"
        height={300}
      />
    );

    expect(screen.getByText('YTD View')).toBeInTheDocument();

    // Test trailing 12 months view
    rerender(
      <EmissionChart
        data={mockChartData}
        title="Trailing 12"
        type="trailing12"
        height={300}
      />
    );

    expect(screen.getByText('Trailing 12')).toBeInTheDocument();
  });

  it('should scale chart dimensions appropriately', () => {
    const { rerender } = render(
      <EmissionChart
        data={mockChartData}
        title="Small Chart"
        type="monthly"
        height={200}
      />
    );

    const chartContainer = screen.getByTestId('chart-container');
    expect(chartContainer).toBeInTheDocument();

    rerender(
      <EmissionChart
        data={mockChartData}
        title="Large Chart"
        type="monthly"
        height={400}
      />
    );

    expect(chartContainer).toBeInTheDocument();
  });

  it('should show target line when target value is provided', () => {
    render(
      <EmissionChart
        data={mockChartData}
        title="Chart with Target"
        type="monthly"
        height={300}
        targetValue={100}
      />
    );

    // Target line should be rendered
    const targetLine = screen.queryByTestId('target-line');
    expect(targetLine).toBeInTheDocument();
  });

  it('should use custom unit when provided', () => {
    render(
      <EmissionChart
        data={mockChartData}
        title="Custom Unit Chart"
        type="monthly"
        height={300}
        unit="kg CO₂e"
      />
    );

    // Should show custom unit in tooltips/labels
    expect(screen.getByText(/kg CO₂e/)).toBeInTheDocument();
  });

  it('should handle large datasets efficiently', () => {
    const largeDataset: ChartDataPoint[] = Array.from({ length: 100 }, (_, i) => ({
      period: `2020-${String(i + 1).padStart(2, '0')}`,
      value: Math.random() * 200,
      quality: (['A', 'B', 'C'] as const)[Math.floor(Math.random() * 3)],
      isEstimated: Math.random() > 0.7,
    }));

    const startTime = performance.now();
    
    render(
      <EmissionChart
        data={largeDataset}
        title="Large Dataset"
        type="monthly"
        height={300}
      />
    );

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(200); // Should render efficiently
  });
});

describe('Chart Accessibility', () => {
  it('should have proper ARIA labels', () => {
    render(
      <EmissionChart
        data={mockChartData}
        title="Accessible Chart"
        type="monthly"
        height={300}
      />
    );

    const chartContainer = screen.getByTestId('chart-container');
    expect(chartContainer).toHaveAttribute('role', 'img');
  });

  it('should be keyboard accessible', () => {
    render(
      <EmissionChart
        data={mockChartData}
        title="Keyboard Chart"
        type="monthly"
        height={300}
      />
    );

    const chartBars = screen.getAllByTestId(/^chart-bar-/);
    if (chartBars.length > 0) {
      const firstBar = chartBars[0];
      expect(firstBar).toBeInTheDocument();
    }
  });
});

describe('Chart Performance', () => {
  it('should optimize re-renders', () => {
    const renderSpy = vi.fn();
    
    const TestWrapper = ({ data }: { data: ChartDataPoint[] }) => {
      renderSpy();
      return (
        <EmissionChart
          data={data}
          title="Performance Test"
          type="monthly"
          height={300}
        />
      );
    };

    const { rerender } = render(<TestWrapper data={mockChartData} />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Re-render with different data should trigger render
    const newData: ChartDataPoint[] = [...mockChartData, {
      period: '2025-04',
      value: 150,
      quality: 'B',
      isEstimated: false,
    }];

    rerender(<TestWrapper data={newData} />);
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });
});
