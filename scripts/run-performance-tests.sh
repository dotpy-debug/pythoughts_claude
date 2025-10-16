#!/bin/bash

# Performance and Accessibility Testing Script
# Runs Lighthouse CI and Pa11y accessibility scans
# Usage: ./scripts/run-performance-tests.sh

set -e  # Exit on error

echo "🚀 Starting Performance and Accessibility Tests"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if tools are installed
echo -e "\n${YELLOW}Checking dependencies...${NC}"

if ! command -v lhci &> /dev/null; then
    echo -e "${RED}❌ Lighthouse CI not installed${NC}"
    echo "Install with: npm install -g @lhci/cli@0.14.x"
    exit 1
fi

if ! command -v pa11y-ci &> /dev/null; then
    echo -e "${RED}❌ Pa11y CI not installed${NC}"
    echo "Install with: npm install -g pa11y-ci"
    exit 1
fi

echo -e "${GREEN}✅ All dependencies installed${NC}"

# Build the application
echo -e "\n${YELLOW}Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Start preview server in background
echo -e "\n${YELLOW}Starting preview server...${NC}"
npm run preview &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:4173 > /dev/null; then
    echo -e "${RED}❌ Server failed to start${NC}"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ Server running on http://localhost:4173${NC}"

# Run Lighthouse CI
echo -e "\n${YELLOW}Running Lighthouse audits...${NC}"
echo "This will take a few minutes (3 runs × 4 URLs = 12 audits)"

mkdir -p lighthouse-results

lhci autorun --config=lighthouserc.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Lighthouse audits complete${NC}"
else
    echo -e "${RED}❌ Lighthouse audits failed${NC}"
    kill $SERVER_PID
    exit 1
fi

# Run Pa11y accessibility scans
echo -e "\n${YELLOW}Running Pa11y accessibility scans...${NC}"

mkdir -p pa11y-screenshots

pa11y-ci --config .pa11yci.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Accessibility scans complete${NC}"
else
    echo -e "${YELLOW}⚠️  Accessibility issues found (check report)${NC}"
fi

# Stop the server
echo -e "\n${YELLOW}Stopping preview server...${NC}"
kill $SERVER_PID
echo -e "${GREEN}✅ Server stopped${NC}"

# Generate summary report
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ All tests complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "📊 Results locations:"
echo "  - Lighthouse results: ./lighthouse-results/"
echo "  - Pa11y screenshots: ./pa11y-screenshots/"
echo ""
echo "📝 Next steps:"
echo "  1. Review Lighthouse results for performance issues"
echo "  2. Check Pa11y screenshots for accessibility violations"
echo "  3. Document findings in docs/PHASE4_PERFORMANCE_REPORT.md"
echo "  4. Fix any critical issues found"
echo ""

exit 0
