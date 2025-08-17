#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Generating bundle analysis...');
console.log('This will build the app with bundle analyzer enabled.');

// Set environment variable to enable bundle analyzer
process.env.ANALYZE = 'true';

try {
  // Dynamic import to ensure we're using ES modules properly
  const { execa } = await import('execa');
  
  console.log('📦 Building with analyzer...');
  await execa('npm', ['run', 'build'], { 
    stdio: 'inherit',
    env: { ...process.env, ANALYZE: 'true' }
  });
  
  console.log('✅ Build complete! Opening bundle analyzer...');
  console.log('📊 Client bundle: .next/analyze/client.html');
  console.log('🖥️  Server bundle: .next/analyze/server.html');
  
  // Try to open the client bundle report
  try {
    const open = (await import('open')).default;
    await open(join(__dirname, '../.next/analyze/client.html'));
  } catch (openError) {
    console.log('💡 Manual: Open .next/analyze/client.html in your browser');
  }
  
} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message);
  process.exit(1);
}
