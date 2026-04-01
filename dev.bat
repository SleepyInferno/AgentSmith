@echo off
title AgentSmith Launcher
echo.
echo  ========================================
echo   AgentSmith - Solo IT Ops Suite
echo  ========================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Download: https://nodejs.org/en/download
    echo.
    pause
    exit /b 1
)

:: Check for pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] pnpm is not installed or not in PATH.
    echo  Install: https://pnpm.io/installation
    echo.
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo  [INFO] Dependencies not installed. Running pnpm install...
    echo.
    pnpm install
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] pnpm install failed. Check the output above.
        pause
        exit /b 1
    )
    echo.
)

:: Check for .env file
if not exist ".env" (
    if exist ".env.example" (
        echo  [INFO] No .env file found. Copying .env.example...
        copy .env.example .env >nul
        echo  [WARN] Created .env from .env.example.
        echo         Edit .env to set SESSION_SECRET before production use.
        echo.
    ) else (
        echo  [WARN] No .env file found. The API may fail to start.
        echo         Copy .env.example to .env and configure it.
        echo.
    )
)

:: Generate Prisma client if needed
if not exist "node_modules\.prisma\client" (
    echo  [INFO] Generating Prisma client...
    pnpm db:generate
    echo.
)

echo  Starting AgentSmith...
echo.
echo  API:  http://localhost:3001
echo  Web:  http://localhost:5173
echo.
echo  Close both windows to stop the servers.
echo.

:: Start API and Web in separate windows
start "AgentSmith API" cmd /k "pnpm --filter @agentsmith/api dev"
start "AgentSmith Web" cmd /k "pnpm --filter @agentsmith/web dev"
