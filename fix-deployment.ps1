# Windows PowerShell Deployment Fix Script
# School Management System - Production Deployment

Write-Host "🚀 School Management System - Windows Deployment Fix" -ForegroundColor Blue
Write-Host "================================================================" -ForegroundColor Blue

# Function to print colored output
function Print-Status {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ⚠️  $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ❌ $Message" -ForegroundColor Red
}

# Check if Docker and Docker Compose are available
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Print-Error "Docker not found. Please install Docker Desktop for Windows."
    exit 1
}

if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Print-Error "docker-compose not found. Please install Docker Compose."
    exit 1
}

Print-Status "Starting deployment fix process..."

# Step 1: Stop existing containers
Print-Status "Step 1: Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down --remove-orphans

# Step 2: Clean up old resources
Print-Status "Step 2: Cleaning up unused Docker resources..."
docker system prune -f

# Step 3: Setup environment file
Print-Status "Step 3: Setting up environment file..."
if (-not (Test-Path .env.production)) {
    if (Test-Path .env.example.production) {
        Copy-Item .env.example.production .env.production
        Print-Warning "Created .env.production from template. Please edit with your values!"
        Print-Warning "Press Enter after editing .env.production..."
        Read-Host
    } else {
        Print-Error ".env.example.production not found!"
        exit 1
    }
} else {
    Print-Status "Environment file .env.production already exists"
}

# Step 4: Build images
Print-Status "Step 4: Building Docker images (this may take a few minutes)..."
$buildResult = docker-compose -f docker-compose.prod.yml build --no-cache
if ($LASTEXITCODE -ne 0) {
    Print-Error "Docker build failed"
    exit 1
}

# Step 5: Start database first
Print-Status "Step 5: Starting database..."
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready
Print-Status "Waiting for database to be ready..."
Start-Sleep -Seconds 15

# Check if database is responding
$maxRetries = 30
$retryCount = 0
do {
    $retryCount++
    $dbReady = docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U school_admin -d school_management 2>$null
    if ($LASTEXITCODE -eq 0) {
        break
    }
    if ($retryCount -ge $maxRetries) {
        Print-Error "Database failed to start after $maxRetries attempts"
        docker-compose -f docker-compose.prod.yml logs postgres
        exit 1
    }
    Write-Host "Waiting for database... (attempt $retryCount/$maxRetries)"
    Start-Sleep -Seconds 2
} while ($retryCount -lt $maxRetries)

Print-Status "Database is ready!"

# Step 6: Start backend
Print-Status "Step 6: Starting backend..."
docker-compose -f docker-compose.prod.yml up -d backend

# Wait for backend to be ready
Print-Status "Waiting for backend to initialize..."
Start-Sleep -Seconds 30

# Check backend health
$retryCount = 0
do {
    $retryCount++
    $backendReady = docker-compose -f docker-compose.prod.yml exec -T backend python manage.py check 2>$null
    if ($LASTEXITCODE -eq 0) {
        break
    }
    if ($retryCount -ge 10) {
        Print-Error "Backend failed to start properly"
        docker-compose -f docker-compose.prod.yml logs backend
        exit 1
    }
    Write-Host "Waiting for backend... (attempt $retryCount/10)"
    Start-Sleep -Seconds 5
} while ($retryCount -lt 10)

Print-Status "Backend is ready!"

# Step 7: Start frontend and nginx
Print-Status "Step 7: Starting frontend and nginx..."
docker-compose -f docker-compose.prod.yml up -d frontend nginx

# Step 8: Final health check
Print-Status "Step 8: Running final health checks..."
Start-Sleep -Seconds 20

# Check all containers are running
$containerStatus = docker-compose -f docker-compose.prod.yml ps
if ($containerStatus -match "Exit") {
    Print-Error "Some containers have exited. Check logs:"
    docker-compose -f docker-compose.prod.yml ps
    exit 1
}

# Test endpoints
Print-Status "Testing endpoints..."
Start-Sleep -Seconds 10

# Test health endpoint
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost/health/" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($healthResponse.StatusCode -eq 200) {
        Print-Status "✅ Health endpoint is responding"
    }
} catch {
    Print-Warning "Health endpoint not responding yet (may need more time)"
}

# Test API endpoint
try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost/api/" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($apiResponse.StatusCode -eq 200) {
        Print-Status "✅ API endpoint is responding"
    }
} catch {
    Print-Warning "API endpoint not responding yet (may need more time)"
}

Print-Status "Step 9: Deployment summary..."
Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Container Status:" -ForegroundColor Blue
docker-compose -f docker-compose.prod.yml ps
Write-Host ""
Write-Host "📋 What's next:" -ForegroundColor Blue
Write-Host "1. Test the application: http://localhost/"
Write-Host "2. Access admin panel: http://localhost/admin/"
Write-Host "3. Check API: http://localhost/api/"
Write-Host "4. Default admin login: admin / admin123"
Write-Host ""
Write-Host "⚠️  Security reminders:" -ForegroundColor Yellow
Write-Host "- Change the default admin password immediately"
Write-Host "- Review and update .env.production with secure values"
Write-Host "- Set up SSL certificates for production use"
Write-Host ""
Write-Host "🔧 Useful commands:" -ForegroundColor Blue
Write-Host "- View logs: docker-compose -f docker-compose.prod.yml logs -f"
Write-Host "- Restart: docker-compose -f docker-compose.prod.yml restart"
Write-Host "- Stop: docker-compose -f docker-compose.prod.yml down"
Write-Host ""
Print-Status "Deployment fix completed!"