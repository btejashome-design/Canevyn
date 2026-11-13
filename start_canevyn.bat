@echo off
echo ========================================================
echo        Starting Canevyn Assistive Mobility System
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/2] Verifying Python and launching FastAPI Backend on port 8000...
start "Canevyn Backend Server" cmd /k "python backend/run_backend.py"

echo [2/2] Waiting for server initialization...
timeout /t 2 /nobreak >nul

echo Opening Canevyn in your browser at http://localhost:8000...
start http://localhost:8000

echo.
echo ========================================================
echo Canevyn is now active!
echo Backend API & Web App: http://localhost:8000
echo ========================================================
pause
