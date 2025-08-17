'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  data: string;
  size?: number;
  className?: string;
}

export default function QRCodeGenerator({ data, size = 200, className = '' }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(data, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQR();
  }, [data, size]);

  if (!qrCodeUrl) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width: size, height: size }}
      >
        <div className="text-gray-500 text-sm">Loading QR...</div>
      </div>
    );
  }

  return (
    <img 
      src={qrCodeUrl} 
      alt="QR Code for certificate verification" 
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
