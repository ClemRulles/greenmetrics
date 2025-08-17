/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  eslint: { 
    ignoreDuringBuilds: true // unblock build now; CI still runs `npm run lint`
  },
  experimental: { 
    staleTimes: { dynamic: 0 },
    optimizePackageImports: ['lodash-es', 'date-fns', 'framer-motion'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: process.env.CDN_HOST ? [process.env.CDN_HOST] : [],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.CDN_HOST || 'app.example.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        { key: "X-Cache-Status", value: "ORIGIN" }, // Debug header for cache troubleshooting
        {
          key: "Content-Security-Policy",
          // Conservative CSP compatible with Next.js and Tailwind
          value: [
            "default-src 'self'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            `img-src 'self' data: https: ${process.env.CDN_HOST || 'app.example.com'}`,
            "style-src 'self' 'unsafe-inline'", // Tailwind injects styles
            "script-src 'self'",
            "connect-src 'self' https://o*.ingest.sentry.io https://app.posthog.com",
            "font-src 'self' data:",
            "object-src 'none'",
            "upgrade-insecure-requests"
          ].join("; ")
        }
      ]
    },
    // Cache static assets aggressively
    {
      source: "/_next/static/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        { key: "X-Cache-Status", value: "STATIC" }
      ]
    },
    // Cache public assets
    {
      source: "/(assets|fonts|images)/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        { key: "X-Cache-Status", value: "ASSET" }
      ]
    },
    // Cache images for 30 days with revalidation
    {
      source: "/:path*\\.(jpg|jpeg|png|webp|avif|ico|svg)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" },
        { key: "X-Cache-Status", value: "IMAGE" }
      ]
    },
    // Cache manifest and favicon
    {
      source: "/(favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        { key: "X-Cache-Status", value: "META" }
      ]
    },
    // Don't cache auth pages
    {
      source: "/(auth|signin|signout)/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        { key: "X-Cache-Status", value: "NO-CACHE-AUTH" }
      ]
    },
    // Don't cache app pages (user-specific)
    {
      source: "/app/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        { key: "X-Cache-Status", value: "NO-CACHE-APP" }
      ]
    },
    // Don't cache API routes by default
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "private, max-age=0, must-revalidate" },
        { key: "X-Cache-Status", value: "NO-CACHE-API" }
      ]
    },
    // Short cache for certificate pages (public but dynamic)
    {
      source: "/certificate/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=1800" },
        { key: "X-Cache-Status", value: "CERT-PUBLIC" }
      ]
    },
    // Short cache for public HTML pages
    {
      source: "/(en|fr)/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=1800, stale-while-revalidate=900" },
        { key: "X-Cache-Status", value: "HTML-PUBLIC" }
      ]
    }
  ]
};

export default withBundleAnalyzer(nextConfig);
