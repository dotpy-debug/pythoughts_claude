#!/bin/bash
# Comprehensive Any Type Fixer using sed
# This script fixes common any type patterns across the codebase

set -e

# Color output
GREEN='\033[0.32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "🔧 Starting comprehensive any type fixes..."

# Fix 1: Error catch blocks (error: any -> error: unknown)
echo "${YELLOW}Fixing error catch blocks...${NC}"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/catch\s*(error:\s*any)/catch (error: unknown)/g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/catch\s*(e:\s*any)/catch (e: unknown)/g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/catch\s*(err:\s*any)/catch (err: unknown)/g' {} +

# Fix 2: Record<string, any> -> Record<string, unknown>
echo "${YELLOW}Fixing Record types...${NC}"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/Record<string,\s*any>/Record<string, unknown>/g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/Record<any,\s*any>/Record<string, unknown>/g' {} +

# Fix 3: Remove " as any" type assertions (needs manual review after)
echo "${YELLOW}Removing simple 'as any' assertions...${NC}"
# This is commented out as it needs context-specific fixes
# find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/\s*as\s*any//g' {} +

# Fix 4: Function parameters
echo "${YELLOW}Fixing function parameters...${NC}"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/(data:\s*any)/(data: unknown)/g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/(value:\s*any)/(value: unknown)/g' {} +
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/(item:\s*any)/(item: unknown)/g' {} +

# Fix 5: Array types
echo "${YELLOW}Fixing array types...${NC}"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/:\s*any\[\]/: unknown[]/g' {} +

echo "${GREEN}✅ Automated fixes complete!${NC}"
echo "${YELLOW}⚠️  Please review changes and fix remaining context-specific any types.${NC}"
echo "${YELLOW}⚠️  Run 'npm run lint' to check remaining issues.${NC}"
