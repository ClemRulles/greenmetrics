#!/usr/bin/env node

/**
 * Bundle Size Budget Checker
 * 
 * Enforces bundle size budgets to prevent performance regressions.
 * Runs after build to validate bundle sizes are within acceptable limits.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Bundle size budgets (in KB)
const BUDGETS = {
  // Client bundles
  'pages/_app.js': 250,  // Main app bundle
  'chunks/framework.js': 150, // React framework
  'chunks/main.js': 100, // Next.js runtime
  'chunks/webpack.js': 50, // Webpack runtime
  
  // Route bundles (average)
  maxRouteBundle: 150, // Individual page bundles
  
  // CSS budgets
  'styles/globals.css': 50,
  maxCssFile: 100,
  
  // Total budgets
  totalJavaScript: 800, // All JS combined
  totalCSS: 200, // All CSS combined
};

function formatSize(bytes) {
  return Math.round(bytes / 1024);
}

function checkBundleSizes() {
  console.log('🔍 Bundle Size Budget Check\n');
  
  const nextDir = path.join(projectRoot, '.next');
  const staticDir = path.join(nextDir, 'static');
  
  if (!fs.existsSync(staticDir)) {
    console.log('❌ Build directory not found. Run `npm run build` first.');
    process.exit(1);
  }
  
  let totalJS = 0;
  let totalCSS = 0;
  let violations = [];
  let checks = [];
  
  // Check specific file budgets
  const checkFile = (filePath, budget, name) => {
    try {
      const stats = fs.statSync(filePath);
      const sizeKB = formatSize(stats.size);
      
      if (sizeKB > budget) {
        violations.push(`❌ ${name}: ${sizeKB}KB > ${budget}KB budget`);
      } else {
        checks.push(`✅ ${name}: ${sizeKB}KB ≤ ${budget}KB budget`);
      }
      
      return stats.size;
    } catch (error) {
      // File doesn't exist, skip
      return 0;
    }
  };
  
  // Walk through build directory to analyze bundles
  function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath, callback);
      } else {
        callback(filePath, stat);
      }
    });
  }
  
  // Analyze all bundles
  walkDir(staticDir, (filePath, stat) => {
    const relativePath = path.relative(staticDir, filePath);
    const ext = path.extname(filePath);
    
    if (ext === '.js') {
      totalJS += stat.size;
      
      // Check individual route bundles
      if (relativePath.includes('pages/') && !relativePath.includes('_app')) {
        const sizeKB = formatSize(stat.size);
        if (sizeKB > BUDGETS.maxRouteBundle) {
          violations.push(`❌ Route bundle ${relativePath}: ${sizeKB}KB > ${BUDGETS.maxRouteBundle}KB`);
        }
      }
    } else if (ext === '.css') {
      totalCSS += stat.size;
      
      const sizeKB = formatSize(stat.size);
      if (sizeKB > BUDGETS.maxCssFile) {
        violations.push(`❌ CSS file ${relativePath}: ${sizeKB}KB > ${BUDGETS.maxCssFile}KB`);
      }
    }
  });
  
  // Check total budgets
  const totalJSKB = formatSize(totalJS);
  const totalCSSKB = formatSize(totalCSS);
  
  if (totalJSKB > BUDGETS.totalJavaScript) {
    violations.push(`❌ Total JavaScript: ${totalJSKB}KB > ${BUDGETS.totalJavaScript}KB budget`);
  } else {
    checks.push(`✅ Total JavaScript: ${totalJSKB}KB ≤ ${BUDGETS.totalJavaScript}KB budget`);
  }
  
  if (totalCSSKB > BUDGETS.totalCSS) {
    violations.push(`❌ Total CSS: ${totalCSSKB}KB > ${BUDGETS.totalCSS}KB budget`);
  } else {
    checks.push(`✅ Total CSS: ${totalCSSKB}KB ≤ ${BUDGETS.totalCSS}KB budget`);
  }
  
  // Report results
  if (checks.length > 0) {
    console.log('✅ Bundle Size Checks Passed:');
    checks.forEach(check => console.log(`   ${check}`));
    console.log('');
  }
  
  if (violations.length > 0) {
    console.log('❌ Bundle Size Budget Violations:');
    violations.forEach(violation => console.log(`   ${violation}`));
    console.log('');
    console.log('💡 Tips to reduce bundle size:');
    console.log('   • Use dynamic imports for large dependencies');
    console.log('   • Enable tree-shaking for unused code');
    console.log('   • Use ANALYZE=true npm run build to identify large modules');
    console.log('   • Consider code splitting for route-specific bundles');
    console.log('');
    
    process.exit(1);
  }
  
  console.log('🎉 All bundle size budgets passed!');
  console.log(`📦 Total bundle sizes: ${totalJSKB}KB JS + ${totalCSSKB}KB CSS = ${totalJSKB + totalCSSKB}KB`);
}

// Run the check
checkBundleSizes();
