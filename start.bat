@echo off
REM SaludClick - Script de Inicio Rápido para Windows
REM Este script inicia tanto el backend como el frontend

echo.
echo ========================================================
echo 🚀 SaludClick - Plataforma de Gestion de Citas Medicas
echo ========================================================
echo.

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js no esta instalado
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node.js encontrado: %NODE_VERSION%
echo.

echo Iniciando servicios...
echo.

REM Iniciar Backend en nueva ventana
echo 1️⃣  Iniciando Backend en puerto 5000...
cd backend
start "SaludClick Backend" cmd /k npm run dev
cd ..

REM Esperar un poco
timeout /t 3 /nobreak

REM Iniciar Frontend en nueva ventana
echo 2️⃣  Iniciando Frontend en puerto 3000...
cd frontend
start "SaludClick Frontend" cmd /k npm run dev -- -H 0.0.0.0
cd ..

echo.
echo ========================================================
echo ✓ Servicios iniciados en nuevas ventanas
echo.
echo 📱 Frontend local: http://localhost:3000
echo 📱 Desde tu movil: usa la IP IPv4 de este PC seguida de :3000
echo    Ejemplo: http://192.168.1.25:3000
echo 🔌 Backend API: disponible en el puerto 5000 de la red local
echo.
echo ========================================================
echo.
pause
