# Performance and Accessibility Testing Script (PowerShell)
# Runs Lighthouse CI and Pa11y accessibility scans
# Usage: .\scripts\run-performance-tests.ps1

Write-Host "🚀 Starting Performance and Accessibility Tests" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if tools are installed
Write-Host "`nChecking dependencies..." -ForegroundColor Yellow

$lhciInstalled = Get-Command lhci -ErrorAction SilentlyContinue
$pa11yInstalled = Get-Command pa11y-ci -ErrorAction SilentlyContinue

if (-not $lhciInstalled) {
    Write-Host "❌ Lighthouse CI not installed" -ForegroundColor Red
    Write-Host "Install with: npm install -g @lhci/cli@0.14.x"
    exit 1
}

if (-not $pa11yInstalled) {
    Write-Host "❌ Pa11y CI not installed" -ForegroundColor Red
    Write-Host "Install with: npm install -g pa11y-ci"
    exit 1
}

Write-Host "✅ All dependencies installed" -ForegroundColor Green

# Build the application
Write-Host "`nBuilding application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful" -ForegroundColor Green

# Start preview server in background
Write-Host "`nStarting preview server..." -ForegroundColor Yellow
$serverProcess = Start-Process npm -ArgumentList "run", "preview" -PassThru -NoNewWindow

# Wait for server to be ready
Write-Host "Waiting for server to start..."
Start-Sleep -Seconds 5

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4173" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Server running on http://localhost:4173" -ForegroundColor Green
} catch {
    Write-Host "❌ Server failed to start" -ForegroundColor Red
    Stop-Process -Id $serverProcess.Id -Force
    exit 1
}

# Run Lighthouse CI
Write-Host "`nRunning Lighthouse audits..." -ForegroundColor Yellow
Write-Host "This will take a few minutes (3 runs × 4 URLs = 12 audits)"

New-Item -ItemType Directory -Force -Path "lighthouse-results" | Out-Null

lhci autorun --config=lighthouserc.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Lighthouse audits complete" -ForegroundColor Green
} else {
    Write-Host "❌ Lighthouse audits failed" -ForegroundColor Red
    Stop-Process -Id $serverProcess.Id -Force
    exit 1
}

# Run Pa11y accessibility scans
Write-Host "`nRunning Pa11y accessibility scans..." -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path "pa11y-screenshots" | Out-Null

pa11y-ci --config .pa11yci.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Accessibility scans complete" -ForegroundColor Green
} else {
    Write-Host "⚠️  Accessibility issues found (check report)" -ForegroundColor Yellow
}

# Stop the server
Write-Host "`nStopping preview server..." -ForegroundColor Yellow
Stop-Process -Id $serverProcess.Id -Force
Write-Host "✅ Server stopped" -ForegroundColor Green

# Generate summary report
Write-Host "`n================================================" -ForegroundColor Green
Write-Host "✅ All tests complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Results locations:"
Write-Host "  - Lighthouse results: .\lighthouse-results\"
Write-Host "  - Pa11y screenshots: .\pa11y-screenshots\"
Write-Host ""
Write-Host "📝 Next steps:"
Write-Host "  1. Review Lighthouse results for performance issues"
Write-Host "  2. Check Pa11y screenshots for accessibility violations"
Write-Host "  3. Document findings in docs\PHASE4_PERFORMANCE_REPORT.md"
Write-Host "  4. Fix any critical issues found"
Write-Host ""

exit 0
