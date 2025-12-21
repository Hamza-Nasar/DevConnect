# DevConnect Fix and Restart Script
Write-Host "🔄 DevConnect Fix Script" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill Node processes
Write-Host "1️⃣ Stopping all Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ Node processes stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Clear Next.js cache
Write-Host "2️⃣ Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ .next folder cleared" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .next folder doesn't exist" -ForegroundColor Gray
}
Write-Host ""

# Step 3: Generate Prisma Client
Write-Host "3️⃣ Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma generate failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Push schema to database
Write-Host "4️⃣ Pushing schema to database..." -ForegroundColor Yellow
npx prisma db push
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Schema pushed to database" -ForegroundColor Green
} else {
    Write-Host "❌ Schema push failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 5: Start dev server
Write-Host "5️⃣ Starting development server..." -ForegroundColor Yellow
Write-Host "🚀 Server will start in a new window" -ForegroundColor Cyan
Write-Host ""
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

Write-Host "✅ All done! Check the new PowerShell window for the dev server." -ForegroundColor Green
Write-Host ""







