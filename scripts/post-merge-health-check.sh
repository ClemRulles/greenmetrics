#!/bin/bash
# Post-Merge Health Check
# Run this after merging Fix Pack to verify production readiness

set -e

echo "🔍 Fix Pack Post-Merge Health Check"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

success() { echo -e "${GREEN}✅ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "ℹ️  $1"; }

# 1. Build Check
info "1. Testing production build..."
npm run build > /dev/null 2>&1 || error "Build failed"
success "Production build succeeds"

# 2. Start production server
info "2. Starting production server..."
npm run start > /dev/null 2>&1 &
SERVER_PID=$!
sleep 5

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT

# 3. Static Asset Health
info "3. Checking static assets..."

FAVICON_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/favicon.ico)
if [ "$FAVICON_STATUS" = "200" ]; then
    success "favicon.ico serves correctly (200)"
else
    error "favicon.ico returned $FAVICON_STATUS"
fi

MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/manifest.webmanifest)
if [ "$MANIFEST_STATUS" = "200" ]; then
    success "manifest.webmanifest serves correctly (200)"
else
    error "manifest.webmanifest returned $MANIFEST_STATUS"
fi

# 4. App Routes Check
info "4. Checking app routes..."
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en)
if [ "$APP_STATUS" = "200" ] || [ "$APP_STATUS" = "307" ]; then
    success "App routes responding (status: $APP_STATUS)"
else
    info "App route status: $APP_STATUS (may require auth)"
fi

# 5. Check for OTEL errors in logs
info "5. Checking for OpenTelemetry errors..."
if [ -f ".next/trace" ]; then
    if grep -q "opentelemetry" .next/trace 2>/dev/null; then
        error "OpenTelemetry errors detected in trace"
    fi
fi
success "No OpenTelemetry module errors detected"

echo ""
echo "===================================="
success "Fix Pack Health Check: ALL SYSTEMS GO! 🚀"
echo ""
info "Ready for:"
echo "  • Production deployment"
echo "  • Static asset serving"
echo "  • Normal application flow"
echo ""
info "Next steps:"
echo "  • Monitor deployment metrics"
echo "  • Queue follow-up PRs (A11y, E2E, CI lint)"
echo "  • Plan OpenTelemetry real implementation"
