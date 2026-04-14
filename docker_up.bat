@echo off
setlocal enabledelayedexpansion

REM ============================================
REM Article Generator - Docker Build & Launch (Windows)
REM Single container serves both Frontend & API
REM ============================================

REM Step 0: Bump version
echo [0/7] Bumping version...
if exist "scripts\bump_version.bat" (
    call scripts\bump_version.bat
)

if exist "VERSION" (
    for /f "tokens=*" %%i in (VERSION) do set "CURRENT_VERSION=%%i"
) else (
    set CURRENT_VERSION=0.0.1
)
echo     - Building version: !CURRENT_VERSION!

REM Step 1: Stop and remove existing container (force cleanup)
echo.
echo [1/7] Stopping and removing existing container...
set "CONTAINER_EXISTS=true"
:check_container
for /f "tokens=*" %%i in ('docker ps -a --filter "name=article-generator" --format "{{.Names}}" 2^>^&1') do (
    if "%%i"=="article-generator" (
        set "CONTAINER_EXISTS=true"
        echo     - Found container: article-generator
        echo     - Stopping container: article-generator
        docker stop article-generator 2>&1
        echo     - Removing container: article-generator
        docker rm -f article-generator 2>&1
        REM Give Docker time to release the container name
        timeout /t 3 /nobreak >nul
        goto check_container
    )
)
set "CONTAINER_EXISTS=false"
echo     - No existing container found or container removed successfully
REM Give Docker time to release the container name
timeout /t 2 /nobreak >nul

REM Step 2: Build Docker image
echo.
echo [2/7] Building Docker image...
docker build -t article-generator:!CURRENT_VERSION! --build-arg VERSION=!CURRENT_VERSION! --no-cache .

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Docker build failed!
    exit /b 1
)

echo.
echo [3/7] Image built successfully: article-generator:!CURRENT_VERSION!
echo.

REM Step 4: Clean up old images
echo [4/7] Cleaning up old images...
set "OLD_IMAGES_FOUND=false"
rem Get current version without any whitespace
for /f "tokens=*" %%v in ("!CURRENT_VERSION!") do set "CURRENT_VERSION_CLEAN=%%v"
for /f "tokens=*" %%i in ('docker images article-generator --format "{{.Tag}}" 2^>^&1') do (
    rem Get tag without any whitespace
    for /f "tokens=*" %%t in ("%%i") do set "TAG_CLEAN=%%t"
    if "!TAG_CLEAN!" neq "!CURRENT_VERSION_CLEAN!" (
        set "OLD_IMAGES_FOUND=true"
        echo     - Removing old image: article-generator:!TAG_CLEAN!
        docker rmi article-generator:!TAG_CLEAN! 2>&1
    )
)
if "!OLD_IMAGES_FOUND!" equ "false" (
    echo     - No old images to clean up
)
echo.
echo [4/7] Image cleanup completed!
echo.

REM Step 5: Final container check and removal
echo [5/7] Final container check and removal...
echo     - Checking for existing container: article-generator
for /f "tokens=*" %%i in ('docker ps -a --filter "name=article-generator" --format "{{.Names}}" 2^>^&1') do (
    if "%%i"=="article-generator" (
        echo     - Found container: article-generator
        echo     - Stopping container: article-generator
        docker stop article-generator 2>&1
        echo     - Removing container: article-generator
        docker rm -f article-generator 2>&1
        REM Give Docker time to release the container name
        timeout /t 3 /nobreak >nul
    )
)
echo     - No existing container found or container removed successfully
REM Give Docker time to release the container name
timeout /t 2 /nobreak >nul

REM Step 6: Final verification and container launch
echo [6/7] Final verification and container launch...

REM Double-check container doesn't exist
for /f "tokens=*" %%i in ('docker ps -a --filter "name=article-generator" --format "{{.Names}}" 2^>^&1') do (
    if "%%i"=="article-generator" (
        echo     - Container still exists, removing...
        docker stop article-generator 2>&1
        docker rm -f article-generator 2>&1
        timeout /t 3 /nobreak >nul
    )
)

REM Verify container is gone
echo     - Verifying container removal...
set "CONTAINER_GONE=false"
:verify_removal
for /f "tokens=*" %%i in ('docker ps -a --filter "name=article-generator" --format "{{.Names}}" 2^>^&1') do (
    if "%%i"=="article-generator" (
        echo     - Container still exists, waiting...
        timeout /t 2 /nobreak >nul
        goto verify_removal
    )
)
set "CONTAINER_GONE=true"
echo     - Container verified removed

REM Launch container
echo     - Launching container...
if defined ARK_API_KEY (
    echo     - Using ARK_API_KEY from environment
    docker run -d --name article-generator -p 5000:5000 -e PYTHONUNBUFFERED=1 -e ARK_API_KEY="!ARK_API_KEY!" -e ARK_BASE_URL="!ARK_BASE_URL!" -e ARK_MODEL="!ARK_MODEL!" article-generator:!CURRENT_VERSION!
) else (
    echo     - Running in demo mode (set ARK_API_KEY to enable AI)
    docker run -d --name article-generator -p 5000:5000 -e PYTHONUNBUFFERED=1 article-generator:!CURRENT_VERSION!
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Failed to start container!
    exit /b 1
)

REM Step 7: Show status
echo.
echo [7/7] Setup complete!
echo.
echo ===========================================
echo    Article Generator v!CURRENT_VERSION!
echo ===========================================
echo.
echo    Container:  article-generator
echo    Version:    v!CURRENT_VERSION!
echo    URL:        http://localhost:5000
echo.
if defined ARK_API_KEY (
    echo    API Token:  ENABLED ^(Volc Engine ARK^)
) else (
    echo    API Token:  DISABLED ^(demo mode^)
    echo.
    echo    To enable: set ARK_API_KEY=your_api_key
    echo    Then run: docker_up.bat
)
echo.
echo ===========================================
echo.

REM Wait for container to be ready
echo Waiting for application to start...
timeout /t 3 /nobreak >nul

echo Container logs ^(last 15 lines^):
docker logs article-generator --tail 15
