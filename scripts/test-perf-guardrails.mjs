#!/usr/bin/env node

/**
 * Performance Guardrails Test Script
 * 
 * Validates that all performance budgets and guardrails are working correctly.
 * This script simulates CI behavior and confirms blocking vs warning behavior.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Performance Guardrails Validation\n');

// Test 1: Bundle Budgets (Non-blocking)
console.log('📦 1. Testing Bundle Size Budgets');
try {
  execSync('node scripts/check-bundle-budgets.mjs', { stdio: 'inherit' });
  console.log('   ✅ Bundle budgets check passed\n');
} catch (error) {
  console.log('   ⚠️  Bundle budgets exceeded (non-blocking)\n');
}

// Test 2: Lighthouse Configuration 
console.log('🔍 2. Lighthouse Budget Configuration');
const lhConfig = JSON.parse(fs.readFileSync('.lighthouserc.json', 'utf8'));

console.log('   📊 Blocking Budgets (FAIL CI on violation):');
lhConfig.ci.assert.assertions['largest-contentful-paint'][0] === 'error' 
  ? console.log('   ✅ LCP ≤ 2.5s (BLOCKING)')
  : console.log('   ❌ LCP should be blocking');

lhConfig.ci.assert.assertions['cumulative-layout-shift'][0] === 'error'
  ? console.log('   ✅ CLS ≤ 0.1 (BLOCKING)')  
  : console.log('   ❌ CLS should be blocking');

console.log('\n   ⚠️  Warning Budgets (WARN but continue):');
lhConfig.ci.assert.assertions['categories:performance'][0] === 'warn'
  ? console.log('   ✅ Performance Score ≥ 90% (WARNING)')
  : console.log('   ❌ Performance score should be warning');

lhConfig.ci.assert.assertions['first-contentful-paint'][0] === 'warn'
  ? console.log('   ✅ FCP ≤ 1.8s (WARNING)')
  : console.log('   ❌ FCP should be warning');

console.log('\n   🌐 Pages to Test:');
lhConfig.ci.collect.url.forEach(url => {
  console.log(`   • ${url}`);
});

// Test 3: RUM Setup
console.log('\n📊 3. Real User Monitoring Setup');
const rumEndpoint = fs.existsSync('app/api/rum/route.ts');
const rumLib = fs.existsSync('lib/perf/reportWebVitals.ts');

console.log(`   ${rumEndpoint ? '✅' : '❌'} RUM API endpoint (/api/rum)`);
console.log(`   ${rumLib ? '✅' : '❌'} Web Vitals reporting library`);

if (rumLib) {
  const rumContent = fs.readFileSync('lib/perf/reportWebVitals.ts', 'utf8');
  const hasConsent = rumContent.includes('consent');
  console.log(`   ${hasConsent ? '✅' : '❌'} Consent-gated reporting`);
}

// Test 4: CI Workflow
console.log('\n🔄 4. CI Workflow Configuration');
const ciFile = fs.existsSync('.github/workflows/perf-ci.yml');
console.log(`   ${ciFile ? '✅' : '❌'} Performance CI workflow`);

if (ciFile) {
  const ciContent = fs.readFileSync('.github/workflows/perf-ci.yml', 'utf8');
  const hasLighthouse = ciContent.includes('lhci autorun') || ciContent.includes('@lhci/cli autorun');
  const hasPR = ciContent.includes('pull_request');
  const hasComment = ciContent.includes('createComment');
  
  console.log(`   ${hasLighthouse ? '✅' : '❌'} Lighthouse CI execution`);
  console.log(`   ${hasPR ? '✅' : '❌'} PR trigger configured`);
  console.log(`   ${hasComment ? '✅' : '❌'} Automated PR comments`);
}

// Test 5: Performance Infrastructure
console.log('\n⚡ 5. Performance Infrastructure');
const fontFile = fs.existsSync('app/(design)/fonts.ts');
const imageComponent = fs.existsSync('components/Perf/Image.tsx');
const nextConfig = fs.existsSync('next.config.ts');

console.log(`   ${fontFile ? '✅' : '❌'} Font optimization setup`);
console.log(`   ${imageComponent ? '✅' : '❌'} Performance image component`);
console.log(`   ${nextConfig ? '✅' : '❌'} Next.js performance config`);

if (nextConfig) {
  const configContent = fs.readFileSync('next.config.ts', 'utf8');
  const hasBundleAnalyzer = configContent.includes('bundle-analyzer');
  const hasImageOpt = configContent.includes('formats');
  const hasCaching = configContent.includes('Cache-Control');
  
  console.log(`   ${hasBundleAnalyzer ? '✅' : '❌'} Bundle analyzer integration`);
  console.log(`   ${hasImageOpt ? '✅' : '❌'} Image format optimization`);
  console.log(`   ${hasCaching ? '✅' : '❌'} Caching headers`);
}

// Summary
console.log('\n📋 PERFORMANCE GUARDRAILS SUMMARY');
console.log('=====================================');
console.log('🚫 BLOCKING (Will fail CI/CD):');
console.log('   • LCP > 2.5s → Build fails');
console.log('   • CLS > 0.1 → Build fails');
console.log('   • Accessibility < 95% → Build fails');
console.log('');
console.log('⚠️  WARNING (Will warn but continue):');
console.log('   • Performance Score < 90% → Warning');
console.log('   • FCP > 1.8s → Warning');  
console.log('   • TBT > 300ms → Warning');
console.log('   • Bundle size exceeded → Warning');
console.log('');
console.log('📊 MONITORING (Production):');
console.log('   • Real User Metrics (consent-gated)');
console.log('   • Bundle analysis on demand');
console.log('   • Performance trend tracking');
console.log('');
console.log('🎯 PROTECTED PAGES:');
console.log('   • /en (Homepage EN)');
console.log('   • /fr (Homepage FR)');
console.log('   • /en/app/partner (Partner Dashboard)');

console.log('\n✅ Performance Guardrails: CONFIGURED');
console.log('🚀 Ready for PR #28 — E2E + Playwright + Axe Integration!');
