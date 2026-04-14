@echo off
REM ============================================
REM Version Bump Script (Windows)
REM Auto-increments last digit: 0.0.1 -> 0.0.2
REM ============================================

setlocal enabledelayedexpansion

set "VERSION_FILE=VERSION"

if not exist "%VERSION_FILE%" (
    echo 0.0.1 > "%VERSION_FILE%"
    echo Created new version file: 0.0.1
    exit /b 0
)

REM Read current version
set /p CURRENT=<"%VERSION_FILE%"

REM Parse version parts
for /f "tokens=1,2,3 delims=." %%a in ("!CURRENT!") do (
    set "major=%%a"
    set "minor=%%b"
    set "patch=%%c"
)

REM Increment patch version
set /a patch=%patch% + 1

REM Create new version
set "NEW_VERSION=!major!.!minor!.!patch!"

REM Write new version (without trailing space)
(echo !NEW_VERSION!) > "%VERSION_FILE%"

echo Version bumped: !CURRENT! -^> !NEW_VERSION!
