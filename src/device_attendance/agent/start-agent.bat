@echo off
title Universal Biometric Cloud Sync Agent
cd /d "%~dp0"
echo ================================================================
echo  Universal Biometric Cloud Sync Agent
echo ================================================================
echo.

if not exist "node_modules" (
    echo [Setup] First time setup: Installing required libraries...
    call npm install --silent
    echo [Setup] Installation complete!
    echo.
)

echo [Connecting] Starting Biometric Sync Engine...
echo.
node agent.js
pause

