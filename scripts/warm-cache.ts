#!/usr/bin/env tsx
/**
 * Cache Warming Script
 * Warms CDN cache by hitting critical pages and assets
 * Usage: node scripts/warm-cache.ts --base https://app.example.com
 */

import { performance } from 'perf_hooks';

interface WarmupResult {
  url: string;
  status: number;
  responseTime: number;
  cacheStatus: string;
  contentLength: number;
  error?: string;
}

interface WarmupStats {
  total: number;
  success: number;
  failed: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  totalTime: number;
}

class CacheWarmer {
  private baseUrl: string;
  private results: WarmupResult[] = [];
  private concurrency: number;
  private timeout: number;

  constructor(baseUrl: string, concurrency = 5, timeout = 10000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.concurrency = concurrency;
    this.timeout = timeout;
  }

  /**
   * Critical pages to warm
   */
  private getCriticalPages(): string[] {
    return [
      // Landing pages
      '/',
      '/en',
      '/fr',
      
      // Public pages  
      '/en/about',
      '/fr/about',
      '/en/pricing',
      '/fr/pricing',
      '/en/features',
      '/fr/features',
      
      // Partner onboarding flow
      '/en/app/partner',
      '/fr/app/partner',
      
      // Certificate sample pages
      '/certificate/sample-carbon-neutral',
      '/certificate/sample-net-zero',
      '/certificate/sample-renewable-energy',
      
      // API health checks
      '/api/ops/health',
      '/api/ops/db/health',
      '/api/ops/ready',
    ];
  }

  /**
   * Static assets to warm
   */
  private getStaticAssets(): string[] {
    return [
      // Meta files
      '/favicon.ico',
      '/manifest.webmanifest',
      '/robots.txt',
      
      // Common static assets (these paths may not exist, but we try)
      '/_next/static/css/app.css',
      '/_next/static/js/app.js',
      '/_next/static/chunks/main.js',
      '/_next/static/chunks/webpack.js',
      
      // Fonts (if any)
      '/fonts/inter-var.woff2',
      
      // Images (common patterns)
      '/images/logo.svg',
      '/images/hero.jpg',
      '/assets/favicon-32x32.png',
      '/assets/apple-touch-icon.png',
    ];
  }

  /**
   * Fetch a single URL and record metrics
   */
  private async warmUrl(url: string): Promise<WarmupResult> {
    const fullUrl = `${this.baseUrl}${url}`;
    const startTime = performance.now();
    
    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'GreenMetrics-CacheWarmer/1.0',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      return {
        url,
        status: response.status,
        responseTime,
        cacheStatus: response.headers.get('cf-cache-status') || 
                    response.headers.get('x-cache-status') || 
                    'UNKNOWN',
        contentLength: parseInt(response.headers.get('content-length') || '0'),
      };
    } catch (error) {
      const endTime = performance.now();
      const responseTime = Math.round(endTime - startTime);
      
      return {
        url,
        status: 0,
        responseTime,
        cacheStatus: 'ERROR',
        contentLength: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process URLs in batches with concurrency control
   */
  private async warmUrlsBatch(urls: string[]): Promise<WarmupResult[]> {
    const results: WarmupResult[] = [];
    
    for (let i = 0; i < urls.length; i += this.concurrency) {
      const batch = urls.slice(i, i + this.concurrency);
      const batchPromises = batch.map(url => this.warmUrl(url));
      
      console.log(`🔥 Warming batch ${Math.floor(i / this.concurrency) + 1}/${Math.ceil(urls.length / this.concurrency)}...`);
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Brief pause between batches to be respectful
      if (i + this.concurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Warm all URLs (pages first, then assets)
   */
  async warmCache(): Promise<WarmupStats> {
    console.log(`🌡️  Starting cache warmup for ${this.baseUrl}`);
    console.log(`⚙️  Concurrency: ${this.concurrency}, Timeout: ${this.timeout}ms`);
    
    const startTime = performance.now();
    
    // Warm critical pages first
    console.log('\n📄 Warming critical pages...');
    const pages = this.getCriticalPages();
    const pageResults = await this.warmUrlsBatch(pages);
    this.results.push(...pageResults);
    
    // Then warm static assets
    console.log('\n🎨 Warming static assets...');
    const assets = this.getStaticAssets();
    const assetResults = await this.warmUrlsBatch(assets);
    this.results.push(...assetResults);
    
    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    // Calculate stats
    const stats = this.calculateStats(totalTime);
    this.printResults(stats);
    
    return stats;
  }

  /**
   * Perform a second pass to check cache hit rates
   */
  async verifyCache(): Promise<WarmupStats> {
    console.log('\n🔍 Verifying cache hits (second pass)...');
    
    const startTime = performance.now();
    
    // Sample subset for verification (most critical pages)
    const verifyUrls = [
      '/',
      '/en', 
      '/fr',
      '/api/ops/health',
      '/favicon.ico',
    ];
    
    const verifyResults = await this.warmUrlsBatch(verifyUrls);
    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    const stats = this.calculateStats(totalTime, verifyResults);
    this.printVerificationResults(stats, verifyResults);
    
    return stats;
  }

  /**
   * Calculate statistics from results
   */
  private calculateStats(totalTime: number, results = this.results): WarmupStats {
    const success = results.filter(r => r.status >= 200 && r.status < 400).length;
    const failed = results.length - success;
    const cacheHits = results.filter(r => 
      ['HIT', 'STALE', 'UPDATING', 'cf:HIT'].includes(r.cacheStatus)
    ).length;
    const cacheMisses = results.filter(r => 
      ['MISS', 'BYPASS', 'cf:MISS', 'ORIGIN'].includes(r.cacheStatus)
    ).length;
    const averageResponseTime = Math.round(
      results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
    );
    
    return {
      total: results.length,
      success,
      failed,
      cacheHits,
      cacheMisses,
      averageResponseTime,
      totalTime,
    };
  }

  /**
   * Print detailed results
   */
  private printResults(stats: WarmupStats): void {
    console.log('\n📊 Cache Warmup Results:');
    console.log('========================================');
    console.log(`Total URLs: ${stats.total}`);
    console.log(`✅ Successful: ${stats.success} (${Math.round(stats.success / stats.total * 100)}%)`);
    console.log(`❌ Failed: ${stats.failed} (${Math.round(stats.failed / stats.total * 100)}%)`);
    console.log(`🎯 Cache Hits: ${stats.cacheHits}`);
    console.log(`🔄 Cache Misses: ${stats.cacheMisses}`);
    console.log(`⏱️  Average Response Time: ${stats.averageResponseTime}ms`);
    console.log(`🕐 Total Time: ${stats.totalTime}ms`);
    
    // Show failures
    const failures = this.results.filter(r => r.status < 200 || r.status >= 400);
    if (failures.length > 0) {
      console.log('\n❌ Failed URLs:');
      failures.forEach(f => {
        console.log(`  ${f.url} - ${f.status} (${f.error || 'HTTP Error'})`);
      });
    }
    
    // Show slow responses
    const slowResponses = this.results.filter(r => r.responseTime > 1000);
    if (slowResponses.length > 0) {
      console.log('\n🐌 Slow Responses (>1s):');
      slowResponses.forEach(s => {
        console.log(`  ${s.url} - ${s.responseTime}ms`);
      });
    }
  }

  /**
   * Print verification results
   */
  private printVerificationResults(stats: WarmupStats, results: WarmupResult[]): void {
    console.log('\n✅ Cache Verification Results:');
    console.log('========================================');
    results.forEach(r => {
      const emoji = ['HIT', 'STALE', 'cf:HIT'].includes(r.cacheStatus) ? '🎯' : 
                   ['MISS', 'cf:MISS'].includes(r.cacheStatus) ? '🔄' : '❓';
      console.log(`${emoji} ${r.url} - ${r.cacheStatus} (${r.responseTime}ms)`);
    });
    
    const hitRate = Math.round(stats.cacheHits / stats.total * 100);
    console.log(`\n🎯 Cache Hit Rate: ${stats.cacheHits}/${stats.total} (${hitRate}%)`);
    
    if (hitRate < 60) {
      console.log('⚠️  Cache hit rate is below 60%. Check CDN configuration.');
    } else if (hitRate > 80) {
      console.log('✨ Excellent cache hit rate!');
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const baseUrlIndex = args.indexOf('--base');
  const concurrencyIndex = args.indexOf('--concurrency');
  const timeoutIndex = args.indexOf('--timeout');
  const verifyFlag = args.includes('--verify');
  
  const baseUrl = baseUrlIndex >= 0 ? args[baseUrlIndex + 1] : 'http://localhost:3000';
  const concurrency = concurrencyIndex >= 0 ? parseInt(args[concurrencyIndex + 1]) : 5;
  const timeout = timeoutIndex >= 0 ? parseInt(args[timeoutIndex + 1]) : 10000;
  
  if (!baseUrl.startsWith('http')) {
    console.error('❌ Invalid base URL. Must start with http:// or https://');
    process.exit(1);
  }
  
  try {
    const warmer = new CacheWarmer(baseUrl, concurrency, timeout);
    
    // Initial warmup
    const warmupStats = await warmer.warmCache();
    
    // Optional verification pass
    if (verifyFlag) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      const verifyStats = await warmer.verifyCache();
      
      // Exit with error if cache hit rate is too low
      const hitRate = verifyStats.cacheHits / verifyStats.total;
      if (hitRate < 0.5) {
        console.error('\n❌ Cache hit rate too low for production deployment');
        process.exit(1);
      }
    }
    
    // Exit with error if too many failures
    const failureRate = warmupStats.failed / warmupStats.total;
    if (failureRate > 0.1) {
      console.error('\n❌ Too many failed requests for production deployment');
      process.exit(1);
    }
    
    console.log('\n🎉 Cache warmup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Cache warmup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { CacheWarmer, type WarmupResult, type WarmupStats };
