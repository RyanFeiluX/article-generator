@echo off
setlocal enabledelayedexpansion

REM ============================================
REM Article Generator - Docker Build & Launch (Windows)
REM Single container serves both Frontend & API
REM ============================================

REM Step 0: Bump version
echo [0/8] Bumping version...
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
echo [1/8] Stopping and removing existing container...
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

REM Step 2: Create cache directories for Python/Node.js packages
echo.
echo [2/8] Creating cache directories...
if not exist "cache\python" mkdir cache\python
if not exist "cache\nodejs" mkdir cache\nodejs
echo     - Cache directories ready

REM Step 3: Build Docker image with BuildKit caching
echo.
echo [3/8] Building Docker image with BuildKit caching...
set DOCKER_BUILDKIT=1
docker build --network=host -t article-generator:!CURRENT_VERSION! --build-arg VERSION=!CURRENT_VERSION! .

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Docker build failed!
    exit /b 1
)

echo.
echo [3/8] Image built successfully: article-generator:!CURRENT_VERSION!
echo.

REM Step 4: Clean up old images
echo [4/8] Cleaning up old images...
set "OLD_IMAGES_FOUND=false"
rem Get current version without any whitespace
for /f "tokens=*" %%v in ("!CURRENT_VERSION!") do set "CURRENT_VERSION_CLEAN=%%v"
for /f "tokens=*" %%i in ('docker images article-generator --format "{{.Tag}}" 2^>^&1') do (
    rem Get tag without any whitespace
    for /f "tokens=*" %%t in ("%%i") do set "TAG_CLEAN=%%t"
    if "!TAG_CLEAN!" neq "!CURRENT_VERSION_CLEAN!" (
        set "OLD_IMAGES_FOUND=true"
        echo     - Removing containers using image: article-generator:!TAG_CLEAN!
        for /f "tokens=*" %%c in ('docker ps -a --filter "ancestor=article-generator:!TAG_CLEAN!" --format "{{.Names}}" 2^>^&1') do (
            docker rm -f %%c 2>&1
        )
        echo     - Removing old image: article-generator:!TAG_CLEAN!
        docker rmi -f article-generator:!TAG_CLEAN! 2>&1
    )
)
if "!OLD_IMAGES_FOUND!" equ "false" (
    echo     - No old images to clean up
)
echo.
echo [4/8] Image cleanup completed!
echo.

REM Step 5: Remove existing container before launch
echo [5/8] Removing existing container before launch...
echo     - Stopping and removing container if exists...
docker stop article-generator 2>nul
docker rm -f article-generator 2>nul
timeout /t 3 /nobreak >nul
echo     - Container removed successfully or no existing container found

REM Step 6: Launch container
echo [6/8] Launching container...
set "MAX_LAUNCH_ATTEMPTS=3"
set "LAUNCH_ATTEMPT=0"
:launch_attempt
set /a LAUNCH_ATTEMPT+=1
if !LAUNCH_ATTEMPT! gtr !MAX_LAUNCH_ATTEMPTS! (
    echo     - ERROR: Failed to launch container after !MAX_LAUNCH_ATTEMPTS! attempts
    goto launch_failed
)

docker stop article-generator 2>nul
docker rm -f article-generator 2>nul

set "CONTAINER_REMOVED=false"
set "WAIT_ATTEMPTS=0"
:wait_for_removal
set /a WAIT_ATTEMPTS+=1
if !WAIT_ATTEMPTS! gtr 10 (
    goto skip_wait
)
set "FOUND=false"
for /f "tokens=*" %%i in ('docker ps -a --filter "name=article-generator" --format "{{.Names}}" 2^>^&1') do (
    if "%%i"=="article-generator" (
        set "FOUND=true"
    )
)
if "!FOUND!" equ "true" (
    timeout /t 1 /nobreak >nul
    goto wait_for_removal
)
set "CONTAINER_REMOVED=true"
:skip_wait

if defined ARK_API_KEY (
    echo     - Using ARK_API_KEY from environment
    docker run -d --name article-generator -p 5000:5000 -e PYTHONUNBUFFERED=1 -e ARK_API_KEY="!ARK_API_KEY!" -e ARK_BASE_URL="!ARK_BASE_URL!" -e ARK_MODEL="!ARK_MODEL!" article-generator:!CURRENT_VERSION! 2>nul
) else (
    echo     - Running in demo mode (set ARK_API_KEY to enable AI)
    docker run -d --name article-generator -p 5000:5000 -e PYTHONUNBUFFERED=1 article-generator:!CURRENT_VERSION! 2>nul
)

set "CONTAINER_CREATED=false"
for /f "tokens=*" %%i in ('docker ps -a --filter "name=article-generator" --format "{{.Names}}" 2^>^&1') do (
    if "%%i"=="article-generator" (
        set "CONTAINER_CREATED=true"
    )
)

if "!CONTAINER_CREATED!" equ "true" (
    goto launch_success
) else (
    echo     - Launch attempt !LAUNCH_ATTEMPT! failed, retrying...
    timeout /t 3 /nobreak >nul
    goto launch_attempt
)

:launch_success
echo     - Container launched successfully
set "LAUNCH_SUCCESS=true"
goto post_launch

:launch_failed
set "LAUNCH_SUCCESS=false"

:post_launch
if not "!LAUNCH_SUCCESS!" equ "true" (
    echo.
    echo [ERROR] Failed to start container!
    exit /b 1
)

REM Step 7: Show status
echo.
echo [7/8] Setup complete!
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

REM Step 8: Show container logs
echo [8/8] Showing container logs...
echo Waiting for application to start...
timeout /t 3 /nobreak >nul

echo Container logs ^(last 15 lines^):
docker logs article-generator --tail 15
