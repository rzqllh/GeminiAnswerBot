@echo off
REM === Hafizh Rizqullah | GeminiAnswerBot ===
REM 🔒 Created by Hafizh Rizqullah || Refine by AI Assistant
REM 📄 cleanup.bat
REM 🕓 Created: 2024-05-22 19:00:00
REM 🧠 Automates project file structure cleanup.

echo =================================================
echo      GeminiAnswerBot Project Cleanup Script
echo =================================================
echo.

REM --- Create necessary directories if they don't exist ---
echo [1/5] Ensuring directory structure...
if not exist "docs" (
    mkdir "docs"
    echo   - Created 'docs' directory.
)
if not exist "js\utils" (
    mkdir "js\utils"
    echo   - Created 'js\utils' directory.
)
if not exist "js\vendor" (
    mkdir "js\vendor"
    echo   - Created 'js\vendor' directory.
)
echo   - Directory structure verified.
echo.

REM --- Move documentation files ---
echo [2/5] Consolidating documentation...
if exist "CHANGELOG.md" (
    move "CHANGELOG.md" "docs\"
    echo   - Moved CHANGELOG.md to docs\
)
if exist "RELEASE.md" (
    move "RELEASE.md" "docs\"
    echo   - Moved RELEASE.md to docs\
)
if exist "SUPPORT.md" (
    move "SUPPORT.md" "docs\"
    echo   - Moved SUPPORT.md to docs\
)
if exist "SECURITY.md" (
    move "SECURITY.md" "docs\"
    echo   - Moved SECURITY.md to docs\
)
echo   - Documentation consolidated.
echo.

REM --- Centralize utility scripts ---
echo [3/5] Centralizing utility scripts...
if exist "js\utils.js" (
    move "js\utils.js" "js\utils\helpers.js"
    echo   - Moved and renamed js\utils.js to js\utils\helpers.js
)
if exist "js\errorHandler.js" (
    move "js\errorHandler.js" "js\utils\"
    echo   - Moved js\errorHandler.js to js\utils\
)
echo   - Utility scripts centralized.
echo.

REM --- Consolidate vendor scripts ---
echo [4/5] Consolidating vendor scripts...
if exist "js\dompurify.min.js" (
    move "js\dompurify.min.js" "js\vendor\"
    echo   - Moved js\dompurify.min.js to js\vendor\
)
if exist "js\mark.min.js" (
    move "js\mark.min.js" "js\vendor\"
    echo   - Moved js\mark.min.js to js\vendor\
)
if exist "js\marked.min.js" (
    move "js\marked.min.js" "js\vendor\"
    echo   - Moved js\marked.min.js to js\vendor\
)
echo   - Vendor scripts consolidated.
echo.

REM --- Delete orphaned and duplicate files ---
echo [5/5] Deleting orphaned and duplicate files...
if exist "js\googleScraper.js" (
    del "js\googleScraper.js"
    echo   - Deleted orphaned file: js\googleScraper.js
)
if exist "js\imageProcessor.js" (
    del "js\imageProcessor.js"
    echo   - Deleted orphaned file: js\imageProcessor.js
)
if exist "assets\back.jpg" (
    del "assets\back.jpg"
    echo   - Deleted duplicate asset: assets\back.jpg
)
REM This handles the case where there might be two mark.min.js files
if exist "js\mark.min.js" (
    del "js\mark.min.js"
    echo   - Deleted duplicate vendor script: js\mark.min.js
)
echo   - Cleanup complete.
echo.

echo =================================================
echo      Project structure has been cleaned up.
echo      Next step: Refactor file paths in HTML files.
echo =================================================
echo.
pause