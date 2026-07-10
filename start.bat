@echo off
echo Starting Training Tracker System...
echo.

echo [1/2] Starting Backend Server (Port 3001)...
start "Backend Server" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend (Port 3000)...
start "Frontend App" cmd /k "cd frontend && npm start"

echo.
echo =============================================
echo   Training Tracker Started Successfully!
echo =============================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to open the app in browser...
pause > nul

start http://localhost:3000

echo.
echo System is running. Close both terminal windows to stop.
echo.
pause
