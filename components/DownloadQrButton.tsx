'use client';

interface DownloadQrButtonProps {
  dataUrl: string;
  filename?: string;
  className?: string;
}

export function DownloadQrButton({ 
  dataUrl, 
  filename = 'certificate-qr.png',
  className = ''
}: DownloadQrButtonProps) {
  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  return (
    <button
      type="button"
      className={`px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${className}`}
      onClick={handleDownload}
      aria-label="Download QR code as PNG file"
    >
      Download QR
    </button>
  );
}
