import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ locale: 'en' }),
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock i18n
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'proofs.title': 'Evidence Vault',
    'proofs.upload.title': 'Upload Evidence Files',
    'proofs.upload.description': 'Upload bills and supporting documents',
    'proofs.upload.dragdrop': 'Drag and drop files here, or click to select',
    'proofs.upload.button': 'Upload Evidence',
    'proofs.meta.kind': 'Evidence Type',
    'proofs.meta.period': 'Coverage Period',
    'proofs.list.title': 'Your Evidence Files',
    'proofs.list.empty': 'No evidence files uploaded yet',
    'proofs.kind.ELECTRICITY_BILL': 'Electricity Bill',
    'proofs.kind.GAS_BILL': 'Gas Bill',
    'proofs.kind.FUEL_INVOICE': 'Fuel Invoice',
    'proofs.kind.OTHER': 'Other Document',
    'proofs.error.upload': 'Upload failed',
    'proofs.success.upload': 'File uploaded successfully',
    'proofs.success.delete': 'File deleted successfully',
  };
  return translations[key] || key;
};

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: mockT }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Proof Vault UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe('Proof Upload Form', () => {
    it('should render upload form with all required fields', async () => {
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      expect(screen.getByText('Evidence Vault')).toBeInTheDocument();
      expect(screen.getByText('Upload Evidence Files')).toBeInTheDocument();
      expect(screen.getByText('Drag and drop files here, or click to select')).toBeInTheDocument();
      expect(screen.getByLabelText('Evidence Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Coverage Period')).toBeInTheDocument();
    });

    it('should validate required fields before submission', async () => {
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      const uploadButton = screen.getByText('Upload Evidence');
      fireEvent.click(uploadButton);
      
      // Should not submit without file and metadata
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle file selection and display preview', async () => {
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      const fileInput = screen.getByRole('button', { name: /drag and drop/i });
      const file = new File(['test content'], 'test-bill.pdf', { type: 'application/pdf' });
      
      // Simulate file selection
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) {
        Object.defineProperty(input, 'files', {
          value: [file],
          writable: false,
        });
        fireEvent.change(input);
      }
      
      await waitFor(() => {
        expect(screen.getByText('test-bill.pdf')).toBeInTheDocument();
      });
    });

    it('should validate file types', async () => {
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const invalidFile = new File(['test'], 'script.js', { type: 'application/javascript' });
      
      if (input) {
        Object.defineProperty(input, 'files', {
          value: [invalidFile],
          writable: false,
        });
        fireEvent.change(input);
      }
      
      // Should show error for invalid file type
      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });

    it('should validate file size limits', async () => {
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      // Create a large file (30MB)
      const largeFile = new File([new ArrayBuffer(30 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      if (input) {
        Object.defineProperty(input, 'files', {
          value: [largeFile],
          writable: false,
        });
        fireEvent.change(input);
      }
      
      // Should show error for file too large
      await waitFor(() => {
        expect(screen.getByText(/file too large/i)).toBeInTheDocument();
      });
    });
  });

  describe('Proof List Display', () => {
    it('should show empty state when no proofs exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ proofs: [] }),
      });
      
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      await waitFor(() => {
        expect(screen.getByText('No evidence files uploaded yet')).toBeInTheDocument();
      });
    });

    it('should display proof list with correct information', async () => {
      const mockProofs = [
        {
          id: 'proof-1',
          kind: 'ELECTRICITY_BILL',
          originalName: 'electricity-jan.pdf',
          periodStart: '2024-01-01T00:00:00.000Z',
          periodEnd: '2024-01-31T23:59:59.999Z',
          createdAt: '2024-02-01T10:00:00.000Z',
        },
        {
          id: 'proof-2',
          kind: 'GAS_BILL',
          originalName: 'gas-jan.pdf',
          periodStart: '2024-01-01T00:00:00.000Z',
          periodEnd: '2024-01-31T23:59:59.999Z',
          createdAt: '2024-02-01T11:00:00.000Z',
        },
      ];
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ proofs: mockProofs }),
      });
      
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      await waitFor(() => {
        expect(screen.getByText('electricity-jan.pdf')).toBeInTheDocument();
        expect(screen.getByText('gas-jan.pdf')).toBeInTheDocument();
        expect(screen.getByText('Electricity Bill')).toBeInTheDocument();
        expect(screen.getByText('Gas Bill')).toBeInTheDocument();
      });
    });

    it('should handle proof deletion', async () => {
      const mockProofs = [
        {
          id: 'proof-1',
          kind: 'ELECTRICITY_BILL',
          originalName: 'electricity-jan.pdf',
          periodStart: '2024-01-01T00:00:00.000Z',
          periodEnd: '2024-01-31T23:59:59.999Z',
          createdAt: '2024-02-01T10:00:00.000Z',
        },
      ];
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ proofs: mockProofs }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      await waitFor(() => {
        expect(screen.getByText('electricity-jan.pdf')).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/supplier/proofs'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data structure', async () => {
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      // Fill form
      const kindSelect = screen.getByLabelText('Evidence Type');
      fireEvent.change(kindSelect, { target: { value: 'ELECTRICITY_BILL' } });
      
      const startInput = screen.getByLabelText(/start/i);
      fireEvent.change(startInput, { target: { value: '2024-01-01' } });
      
      const endInput = screen.getByLabelText(/end/i);
      fireEvent.change(endInput, { target: { value: '2024-01-31' } });
      
      // Add file
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test content'], 'test-bill.pdf', { type: 'application/pdf' });
      
      if (input) {
        Object.defineProperty(input, 'files', {
          value: [file],
          writable: false,
        });
        fireEvent.change(input);
      }
      
      await waitFor(() => {
        expect(screen.getByText('test-bill.pdf')).toBeInTheDocument();
      });
      
      // Submit
      const uploadButton = screen.getByText('Upload Evidence');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/supplier/proofs'),
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });
    });

    it('should show success message after successful upload', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, id: 'new-proof-id' }),
      });
      
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      // Complete upload process (simplified)
      const uploadButton = screen.getByText('Upload Evidence');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText('File uploaded successfully')).toBeInTheDocument();
      });
    });

    it('should show error message on upload failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' }),
      });
      
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      // Attempt upload
      const uploadButton = screen.getByText('Upload Evidence');
      fireEvent.click(uploadButton);
      
      await waitFor(() => {
        expect(screen.getByText('Upload failed')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('Evidence Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Coverage Period')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload evidence/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const ProofVaultPage = (await import('@/app/[locale]/app/proofs/page')).default;
      
      render(<ProofVaultPage />);
      
      // Tab through form elements
      const kindSelect = screen.getByLabelText('Evidence Type');
      kindSelect.focus();
      expect(kindSelect).toHaveFocus();
      
      // Simulate tab to next element
      fireEvent.keyDown(kindSelect, { key: 'Tab' });
      const startInput = screen.getByLabelText(/start/i);
      startInput.focus();
      expect(startInput).toHaveFocus();
    });
  });
});
