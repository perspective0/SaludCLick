#!/bin/bash

# SaludClick - Script de Inicio Rápido
# Este script inicia tanto el backend como el frontend

echo "🚀 SaludClick - Plataforma de Gestión de Citas Médicas"
echo "=================================================="
echo ""

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar si el puerto está en uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}⚠️  Puerto $1 ya está en uso${NC}"
        return 0
    else
        return 1
    fi
}

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js encontrado: $(node -v)${NC}"
echo ""

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL no está instalado - Se requiere para la BD${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL encontrado${NC}"
fi

echo ""
echo "Iniciando servicios..."
echo ""

# Iniciar Backend
echo -e "${YELLOW}1️⃣  Iniciando Backend...${NC}"
if check_port 5000; then
    echo -e "${YELLOW}   Usando puerto alternativo 5001${NC}"
    cd backend
    PORT=5001 npm run dev &
else
    cd backend
    npm run dev &
fi

BACKEND_PID=$!
echo -e "${GREEN}✓ Backend iniciado (PID: $BACKEND_PID)${NC}"
echo ""

# Esperar un poco
sleep 3

# Iniciar Frontend
echo -e "${YELLOW}2️⃣  Iniciando Frontend...${NC}"
if check_port 3000; then
    echo -e "${YELLOW}   Usando puerto alternativo 3001${NC}"
    cd ../frontend
    PORT=3001 npm run dev &
else
    cd ../frontend
    npm run dev &
fi

FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend iniciado (PID: $FRONTEND_PID)${NC}"
echo ""

echo "=================================================="
echo -e "${GREEN}✓ Servicios iniciados correctamente${NC}"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔌 Backend: http://localhost:5000/api"
echo ""
echo "Para detener los servicios, presiona Ctrl+C"
echo "=================================================="

# Esperar a que los procesos terminen
wait $BACKEND_PID $FRONTEND_PID
