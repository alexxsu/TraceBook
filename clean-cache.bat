@echo off
echo Cleaning Vite cache...

REM Remove all possible cache directories
rmdir /s /q node_modules\.vite 2>nul
rmdir /s /q node_modules\.vite_cache 2>nul
rmdir /s /q .vite 2>nul

REM Remove node_modules and reinstall
rmdir /s /q node_modules 2>nul
del /f package-lock.json 2>nul

echo.
echo Cache cleared! Now run:
echo   npm install
echo   npm run dev
echo.
pause
