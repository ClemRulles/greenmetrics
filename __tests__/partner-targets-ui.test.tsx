import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en', orgId: 'test-org' }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('Partner Targets UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
      blob: () => Promise.resolve(new Blob(['test csv content'])),
    });
  });

  describe('Partner Targets Form', () => {
    it('should render all target input fields', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      expect(screen.getByText('Partner Targets')).toBeInTheDocument();
      expect(screen.getByLabelText(/coverage target/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minimum data quality/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/attributed.*target/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/baseline year/i)).toBeInTheDocument();
    });

    it('should have default values set', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const coverageInput = screen.getByLabelText(/coverage target/i) as HTMLInputElement;
      const dqsSelect = screen.getByLabelText(/minimum data quality/i) as HTMLSelectElement;
      const targetTonsInput = screen.getByLabelText(/attributed.*target/i) as HTMLInputElement;
      const baselineYearInput = screen.getByLabelText(/baseline year/i) as HTMLInputElement;
      
      expect(coverageInput.value).toBe('80');
      expect(dqsSelect.value).toBe('B');
      expect(targetTonsInput.value).toBe('1000');
      expect(baselineYearInput.value).toBe((new Date().getFullYear() - 1).toString());
    });

    it('should update input values when changed', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const coverageInput = screen.getByLabelText(/coverage target/i) as HTMLInputElement;
      const dqsSelect = screen.getByLabelText(/minimum data quality/i) as HTMLSelectElement;
      const targetTonsInput = screen.getByLabelText(/attributed.*target/i) as HTMLInputElement;
      
      fireEvent.change(coverageInput, { target: { value: '90' } });
      fireEvent.change(dqsSelect, { target: { value: 'A' } });
      fireEvent.change(targetTonsInput, { target: { value: '1200' } });
      
      expect(coverageInput.value).toBe('90');
      expect(dqsSelect.value).toBe('A');
      expect(targetTonsInput.value).toBe('1200');
    });

    it('should submit targets when save button is clicked', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const saveButton = screen.getByText('Save targets');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/partner/test-org/targets',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.any(String)
          })
        );
      });
    });

    it('should show loading state when saving', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 100))
      );

      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const saveButton = screen.getByText('Save targets');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('should show current progress metrics', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('Current Progress')).toBeInTheDocument();
        expect(screen.getByText('Coverage')).toBeInTheDocument();
        expect(screen.getByText('Data Quality')).toBeInTheDocument();
        expect(screen.getByText('Attributed Emissions')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('should display progress bars with correct values', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      await waitFor(() => {
        // Progress bars should be rendered
        const progressBars = document.querySelectorAll('.bg-green-500, .bg-yellow-500, .bg-red-500');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should show on-track status correctly', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      await waitFor(() => {
        expect(screen.getByText('On track')).toBeInTheDocument();
      });
    });
  });

  describe('Snapshot Functionality', () => {
    it('should take snapshot when button is clicked', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const snapshotButton = screen.getByText('Take snapshot');
      fireEvent.click(snapshotButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/partner/test-org/targets/snapshot',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"year"')
          })
        );
      });
    });

    it('should show loading state when taking snapshot', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 100))
      );

      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const snapshotButton = screen.getByText('Take snapshot');
      fireEvent.click(snapshotButton);
      
      expect(screen.getByText('Creating snapshot...')).toBeInTheDocument();
    });
  });

  describe('Data Export Functionality', () => {
    it('should render export section', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      expect(screen.getByText('Data Exports')).toBeInTheDocument();
      expect(screen.getByText('Download privacy-safe Scope 3 Category 1 data')).toBeInTheDocument();
      expect(screen.getByText('Download CSV')).toBeInTheDocument();
      expect(screen.getByText('Download JSON')).toBeInTheDocument();
    });

    it('should download CSV when CSV button is clicked', async () => {
      // Mock URL.createObjectURL and document methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      document.createElement = vi.fn().mockReturnValue(mockLink);
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();

      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const csvButton = screen.getByText('Download CSV');
      fireEvent.click(csvButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/partner/test-org/exports/scope3.csv'),
          undefined
        );
      });
    });

    it('should download JSON when JSON button is clicked', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          meta: { organizationId: 'test-org', year: 2024 },
          rows: []
        }),
      });

      // Mock URL and document methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      document.createElement = vi.fn().mockReturnValue(mockLink);
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();

      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const jsonButton = screen.getByText('Download JSON');
      fireEvent.click(jsonButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/partner/test-org/exports/scope3.json'),
          undefined
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should accept valid coverage percentage values', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const coverageInput = screen.getByLabelText(/coverage target/i) as HTMLInputElement;
      
      // Test valid values
      const validValues = ['0', '50', '80', '100'];
      
      validValues.forEach(value => {
        fireEvent.change(coverageInput, { target: { value } });
        expect(coverageInput.value).toBe(value);
      });
    });

    it('should handle DQS grade selection', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const dqsSelect = screen.getByLabelText(/minimum data quality/i) as HTMLSelectElement;
      
      // Test all grade options
      const grades = ['A', 'B', 'C'];
      
      grades.forEach(grade => {
        fireEvent.change(dqsSelect, { target: { value: grade } });
        expect(dqsSelect.value).toBe(grade);
      });
    });

    it('should accept positive target tons values', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const targetTonsInput = screen.getByLabelText(/attributed.*target/i) as HTMLInputElement;
      
      fireEvent.change(targetTonsInput, { target: { value: '1500.5' } });
      expect(targetTonsInput.value).toBe('1500.5');
    });

    it('should accept valid baseline years', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const baselineYearInput = screen.getByLabelText(/baseline year/i) as HTMLInputElement;
      const currentYear = new Date().getFullYear();
      
      fireEvent.change(baselineYearInput, { target: { value: currentYear.toString() } });
      expect(baselineYearInput.value).toBe(currentYear.toString());
    });
  });

  describe('Error Handling', () => {
    it('should show error message when save fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Save failed' }),
      });

      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const saveButton = screen.getByText('Save targets');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
    });

    it('should show error message when snapshot fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Snapshot failed' }),
      });

      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const snapshotButton = screen.getByText('Take snapshot');
      fireEvent.click(snapshotButton);
      
      await waitFor(() => {
        expect(screen.getByText('Snapshot failed')).toBeInTheDocument();
      });
    });

    it('should show error message when export fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Export failed' }),
      });

      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const csvButton = screen.getByText('Download CSV');
      fireEvent.click(csvButton);
      
      await waitFor(() => {
        expect(screen.getByText('Export failed')).toBeInTheDocument();
      });
    });
  });

  describe('Success Messages', () => {
    it('should show success message when targets are saved', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const saveButton = screen.getByText('Save targets');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Targets saved successfully')).toBeInTheDocument();
      });
    });

    it('should show success message when snapshot is created', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const snapshotButton = screen.getByText('Take snapshot');
      fireEvent.click(snapshotButton);
      
      await waitFor(() => {
        expect(screen.getByText('Progress snapshot created')).toBeInTheDocument();
      });
    });

    it('should show success message when export is downloaded', async () => {
      // Mock successful blob response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['csv,data'])),
      });

      // Mock URL and document methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      document.createElement = vi.fn().mockReturnValue(mockLink);
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();

      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      const csvButton = screen.getByText('Download CSV');
      fireEvent.click(csvButton);
      
      await waitFor(() => {
        expect(screen.getByText('Export downloaded successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      expect(screen.getByLabelText(/coverage target/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minimum data quality/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/attributed.*target/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/baseline year/i)).toBeInTheDocument();
    });

    it('should have proper button roles', async () => {
      const PartnerTargetsPage = (await import('@/app/[locale]/app/partner/targets/page')).default;
      
      render(<PartnerTargetsPage />);
      
      expect(screen.getByRole('button', { name: /save targets/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /take snapshot/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download json/i })).toBeInTheDocument();
    });
  });
});
