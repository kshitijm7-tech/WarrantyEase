# WarrantyEase API - Backend Foundation (Stage 0 & 1)

This is the Python FastAPI backend for the WarrantyEase project. It provides a local development environment with DynamoDB Local.

## Prerequisites

- **Python 3.11+** (3.12 recommended)
- **Docker Desktop** or **Docker Engine** (for DynamoDB Local)
- **Git** (for cloning)

## Quick Start (Windows PowerShell)

### 1. Check Python and Docker Availability

```powershell
# Check Python version (should be 3.11+)
python --version

# Check if Docker is installed and running
docker --version
docker info
```

**If Docker is not installed:**
- Download and install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- Start Docker Desktop and wait for it to report "Docker Desktop is running"
- Verify with `docker info` in a new PowerShell window

### 2. Navigate to Backend Directory

```powershell
cd D:\Projects\WarrantyEase\backend
```

### 3. Create Virtual Environment

```powershell
# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Verify activation (should show venv path)
where python
```

### 4. Install Dependencies

```powershell
# Upgrade pip first
python -m pip install --upgrade pip

# Install project dependencies
pip install -r requirements.txt
```

### 5. Configure Environment

```powershell
# Copy example environment file
Copy-Item .env.example .env

# Verify .env exists
Get-ChildItem .env
```

The default `.env` values work for local development:
- FastAPI on `http://localhost:8001`
- DynamoDB Local on `http://localhost:8000`
- Frontend on `http://localhost:3000`

### 6. Start DynamoDB Local

```powershell
# Start DynamoDB Local in background
docker-compose up -d

# Verify container is running
docker-compose ps

# Check logs if needed
docker-compose logs dynamodb-local

# Wait for health check to pass (may take 5-10 seconds)
# You can also test connectivity:
curl http://localhost:8000
```

**If port 8000 is already in use:**
```powershell
# Check what's using port 8000
netstat -ano | findstr :8000

# Stop the conflicting process or change the port in docker-compose.yml
```

### 7. Create Development Table

```powershell
# Run the table creation script (or just start the app - it creates the table on startup)
python -c "
from app.database.dynamodb import db
success = db.create_dev_table()
print('Table created:' if success else 'Table creation failed:')
"
```

### 8. Start FastAPI Server

```powershell
# Start the development server on port 8001
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process using WatchFiles
INFO:     Starting WarrantyEase API v0.1.0 in development mode
INFO:     DynamoDB endpoint: http://localhost:8000
INFO:     DynamoDB table: WarrantyEase-Dev
INFO:     Frontend origins: ['http://localhost:3000']
INFO:     Attempting to create/verify development table...
INFO:     Development table ready
INFO:     Application startup complete.
```

### 9. Verify Endpoints

Open these URLs in your browser or test with curl:

| Endpoint | URL | Description |
|----------|-----|-------------|
| Root | http://localhost:8001/ | Service info |
| Health | http://localhost:8001/health | Basic health check |
| API Health | http://localhost:8001/api/v1/health | Versioned health check |
| DB Health | http://localhost:8001/health/db | DynamoDB connectivity |
| **Warranties List** | http://localhost:8001/api/v1/warranties | **GET all warranties** |
| **Warranties CRUD** | http://localhost:8001/api/v1/warranties/{id} | **GET/PUT/DELETE single** |
| Docs | http://localhost:8001/docs | Interactive API documentation (Swagger UI) |
| ReDoc | http://localhost:8001/redoc | Alternative API documentation |

**Test with curl:**
```powershell
# Basic health
curl http://localhost:8001/health

# Database health
curl http://localhost:8001/health/db

# Root
curl http://localhost:8001/

# List warranties
curl http://localhost:8001/api/v1/warranties
```

### 10. Run Tests

```powershell
# Run all tests
python -m pytest tests/ -v

# Run with coverage (optional)
pip install pytest-cov
python -m pytest tests/ -v --cov=app --cov-report=term-missing
```

Expected output (with DynamoDB running):
```
tests/test_health.py::TestHealthEndpoints::test_health_check PASSED
tests/test_health.py::TestHealthEndpoints::test_api_v1_health_check PASSED
tests/test_health.py::TestDatabaseHealthCheck::test_database_health_check_connected PASSED
tests/test_health.py::TestDatabaseHealthCheck::test_database_health_check_disconnected PASSED
tests/test_health.py::TestApplicationStartup::test_app_starts_without_database PASSED
tests/test_health.py::TestApplicationStartup::test_root_endpoint PASSED
tests/test_health.py::TestDynamoDBClient::test_get_table_name PASSED
tests/test_health.py::TestDynamoDBClient::test_check_connection_handles_errors PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_list_warranties_empty PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_list_warranties_with_data PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_list_warranties_db_unavailable PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_get_warranty_found PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_get_warranty_not_found PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_get_warranty_db_unavailable PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_create_warranty_valid PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_create_warranty_invalid PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_create_warranty_db_unavailable PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_create_warranty_conflict PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_update_warranty_success PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_update_warranty_not_found PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_update_warranty_db_unavailable PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_delete_warranty_success PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_delete_warranty_not_found PASSED
tests/test_warranties.py::TestWarrantiesEndpoints::test_delete_warranty_db_unavailable PASSED
tests/test_warranties.py::TestWarrantiesUserIsolation::test_user_cannot_retrieve_another_users_warranty PASSED
tests/test_warranties.py::TestWarrantiesUserIsolation::test_user_cannot_update_another_users_warranty PASSED
tests/test_warranties.py::TestWarrantiesUserIsolation::test_user_cannot_delete_another_users_warranty PASSED
tests/test_warranties.py::TestWarrantyModels::test_warranty_create_valid PASSED
tests/test_warranties.py::TestWarrantyModels::test_warranty_create_invalid_date PASSED
tests/test_warranties.py::TestWarrantyModels::test_warranty_create_negative_price PASSED
tests/test_warranties.py::TestWarrantyModels::test_warranty_update_partial PASSED
tests/test_warranties.py::TestWarrantyModels::test_warranty_update_invalid_duration PASSED
tests/test_warranties.py::TestHealthEndpointsStillWork::test_health_check PASSED
tests/test_warranties.py::TestHealthEndpointsStillWork::test_api_v1_health_check PASSED
tests/test_warranties.py::TestHealthEndpointsStillWork::test_database_health_check PASSED
tests/test_warranties.py::TestHealthEndpointsStillWork::test_root_endpoint PASSED
```

**If DynamoDB is not running**, the `test_database_health_check_connected` test will fail (expected), but the others should pass.

## Warranty CRUD API Examples

### List all warranties
```powershell
curl http://localhost:8001/api/v1/warranties
```

### Create a warranty
```powershell
$warranty = @{
    productName = "MacBook Pro 16\" M3 Max"
    brand = "Apple"
    category = "Computing"
    seller = "Apple Store"
    invoiceNumber = "INV-APL-901823"
    purchaseDate = "2024-11-15"
    purchasePrice = 3499.00
    currency = "USD"
    warrantyStartDate = "2024-11-15"
    warrantyDurationMonths = 36
    warrantyExpiryDate = "2027-11-15"
    serialNumber = "C02GM909MD6T"
    notes = "Configured with AppleCare+ 3-year extension"
    coverageSummary = "Comprehensive hardware failure protection..."
    exclusions = @("Cosmetic damage", "Theft")
    claimRequirements = @("Serial number", "Proof of purchase")
    claimContact = @{
        phone = "1-800-275-2273"
        email = "support@apple.com"
        url = "https://support.apple.com/repair"
        supportHours = "24/7 Phone & Online Support"
    }
    sourceWarrantyText = "AppleCare+ covers hardware repair..."
    documentIds = @("doc-1")
} | ConvertTo-Json -Depth 5

curl -X POST http://localhost:8001/api/v1/warranties `
  -H "Content-Type: application/json" `
  -d $warranty
```

### Get a single warranty
```powershell
curl http://localhost:8001/api/v1/warranties/war-abc123
```

### Update a warranty
```powershell
$update = @{ productName = "Updated Product Name" } | ConvertTo-Json
curl -X PUT http://localhost:8001/api/v1/warranties/war-abc123 `
  -H "Content-Type: application/json" `
  -d $update
```

### Delete a warranty
```powershell
curl -X DELETE http://localhost:8001/api/v1/warranties/war-abc123
```

### Error responses
| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | Deleted (no content) |
| 404 | Warranty not found |
| 422 | Validation error (missing/invalid fields) |
| 409 | Conflict (duplicate ID) |
| 503 | Database unavailable |

## Troubleshooting

### Port Conflicts

| Service | Default Port | Change If Needed |
|---------|--------------|------------------|
| Frontend (Vite) | 3000 | `frontend/package.json` dev script |
| DynamoDB Local | 8000 | `docker-compose.yml` ports mapping |
| FastAPI | 8001 | `.env` PORT or uvicorn command |

### DynamoDB Connection Issues

1. **Container not starting:**
   ```powershell
   docker-compose logs dynamodb-local
   ```

2. **Health check failing:**
   ```powershell
   # Test manually
   docker exec warrantease-dynamodb curl -f http://localhost:8000
   ```

3. **Table creation fails:**
   - Ensure DynamoDB container is healthy (`docker-compose ps` shows "healthy")
   - Check endpoint URL in `.env` matches `http://localhost:8000`

### Python Import Errors

```powershell
# Ensure virtual environment is activated
.\venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### CORS Errors from Frontend

- Ensure `FRONTEND_ORIGINS` in `.env` includes `http://localhost:3000`
- The frontend must be running on port 3000 (default Vite config)

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, lifespan, CORS
│   ├── config.py            # Pydantic Settings
│   ├── database/
│   │   ├── __init__.py
│   │   └── dynamodb.py      # DynamoDB client wrapper
│   ├── models/
│   │   ├── __init__.py
│   │   └── warranty.py      # Pydantic models (create/update/response)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py        # /health, /api/v1/health, /health/db
│   │   └── warranties.py    # /api/v1/warranties CRUD
│   ├── services/
│   │   ├── __init__.py
│   │   └── warranty_service.py  # DynamoDB repository logic
│   └── utils/
├── tests/
│   ├── __init__.py
│   ├── test_health.py       # Health endpoint tests
│   └── test_warranties.py   # Warranty CRUD tests
├── requirements.txt
├── .env.example
├── .env                     # Created locally (gitignored)
├── .gitignore
├── docker-compose.yml       # DynamoDB Local only
└── README.md
```

## Next Steps (After Stage 1 Review)

Stage 2 will implement:
- Document upload with S3 presigned URLs
- Amazon Textract integration for invoice OCR
- Document metadata management
- Notification system with EventBridge Scheduler

Stage 3 will implement:
- Warranty Assistant (RAG with Bedrock/OpenSearch)
- Email notifications via SES
- Automated expiry scanning

## License

MIT - College project for educational purposes.