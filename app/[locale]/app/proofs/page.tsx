'use client';

import { useState, useRef, useCallback } from 'react';

// Placeholder translation function - replace with actual i18n implementation
const useTranslations = (namespace: string) => (key: string, vars?: any) => {
  // Mock translations for demo
  const translations: Record<string, any> = {
    'title': 'Proof Vault',
    'subtitle': 'Private evidence storage for emissions data',
    'upload.title': 'Upload Proof',
    'upload.dragDrop': 'Drag and drop files here, or click to select',
    'upload.selectFile': 'Select File',
    'upload.uploading': 'Uploading...',
    'upload.upload': 'Upload',
    'upload.success': 'File uploaded successfully',
    'upload.error': 'Failed to upload file',
    'upload.maxSize': 'Maximum file size: 25MB',
    'upload.allowedTypes': 'Allowed types: PDF, Images, CSV, Excel',
    'form.proofKind': 'Proof Type',
    'form.kinds.ELECTRICITY_BILL': 'Electricity Bill',
    'form.kinds.GAS_BILL': 'Gas Bill',
    'form.kinds.FUEL_INVOICE': 'Fuel Invoice',
    'form.kinds.OTHER': 'Other',
    'form.periodStart': 'Period Start',
    'form.periodEnd': 'Period End',
    'form.selectKind': 'Select proof type',
    'list.title': 'Uploaded Proofs',
    'list.empty': 'No proofs uploaded yet',
    'list.filename': 'Filename',
    'list.type': 'Type',
    'list.period': 'Period',
    'list.size': 'Size',
    'list.uploaded': 'Uploaded',
    'list.actions': 'Actions',
    'list.delete': 'Delete',
    'list.confirmDelete': 'Are you sure you want to delete this proof?',
    'list.deleteSuccess': 'Proof deleted successfully',
    'list.deleteError': 'Failed to delete proof',
    'privacy.title': 'Privacy Notice',
    'privacy.description': 'Files are stored securely and only summary statistics are shared with partners. Your actual documents remain private.',
  };
  return translations[key] || key;
};

type ProofKind = 'ELECTRICITY_BILL' | 'GAS_BILL' | 'FUEL_INVOICE' | 'OTHER';

interface Proof {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: ProofKind;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

interface UploadFormData {
  kind: ProofKind | '';
  periodStart: string;
  periodEnd: string;
}

export default function ProofsPage() {
  const t = useTranslations('proofs');
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    kind: '',
    periodStart: '',
    periodEnd: '',
  });
  const [uploading, setUploading] = useState(false);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock organization ID - in real implementation, get from session/context
  const organizationId = 'demo-org';

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !formData.kind || !formData.periodStart || !formData.periodEnd) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      const metadata = {
        organizationId,
        kind: formData.kind,
        periodStart: new Date(formData.periodStart).toISOString(),
        periodEnd: new Date(formData.periodEnd).toISOString(),
      };

      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('meta', JSON.stringify(metadata));

      const response = await fetch('/api/supplier/proofs', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Add to proofs list
      setProofs(prev => [result.proof, ...prev]);
      
      // Reset form
      setFile(null);
      setFormData({ kind: '', periodStart: '', periodEnd: '' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert(t('upload.success'));

    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : t('upload.error'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (proofId: string) => {
    if (!confirm(t('list.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/supplier/proofs?id=${proofId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      setProofs(prev => prev.filter(p => p.id !== proofId));
      alert(t('list.deleteSuccess'));

    } catch (error) {
      console.error('Delete error:', error);
      alert(t('list.deleteError'));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {t('title')}
        </h1>
        <p className="text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">
          {t('privacy.title')}
        </h3>
        <p className="text-blue-700 text-sm">
          {t('privacy.description')}
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {t('upload.title')}
        </h2>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="space-y-2">
              <div className="text-gray-500 text-sm">
                {file ? (
                  <span className="font-medium text-gray-700">
                    Selected: {file.name} ({formatFileSize(file.size)})
                  </span>
                ) : (
                  t('upload.dragDrop')
                )}
              </div>
              
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                {t('upload.selectFile')}
              </button>
              
              <div className="text-xs text-gray-500 space-y-1">
                <div>{t('upload.maxSize')}</div>
                <div>{t('upload.allowedTypes')}</div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.proofKind')} *
              </label>
              <select
                value={formData.kind}
                onChange={(e) => setFormData(prev => ({ ...prev, kind: e.target.value as ProofKind }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">{t('form.selectKind')}</option>
                <option value="ELECTRICITY_BILL">{t('form.kinds.ELECTRICITY_BILL')}</option>
                <option value="GAS_BILL">{t('form.kinds.GAS_BILL')}</option>
                <option value="FUEL_INVOICE">{t('form.kinds.FUEL_INVOICE')}</option>
                <option value="OTHER">{t('form.kinds.OTHER')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.periodStart')} *
              </label>
              <input
                type="date"
                value={formData.periodStart}
                onChange={(e) => setFormData(prev => ({ ...prev, periodStart: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.periodEnd')} *
              </label>
              <input
                type="date"
                value={formData.periodEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, periodEnd: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!file || !formData.kind || !formData.periodStart || !formData.periodEnd || uploading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? t('upload.uploading') : t('upload.upload')}
            </button>
          </div>
        </form>
      </div>

      {/* Proofs List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {t('list.title')}
          </h2>
        </div>

        {proofs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('list.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('list.filename')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('list.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('list.period')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('list.size')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('list.uploaded')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('list.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {proofs.map((proof) => (
                  <tr key={proof.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {proof.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {t(`form.kinds.${proof.kind}`)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(proof.periodStart)} - {formatDate(proof.periodEnd)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatFileSize(proof.sizeBytes)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(proof.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(proof.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        {t('list.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
