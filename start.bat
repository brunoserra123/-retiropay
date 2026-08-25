@echo off
echo ====================================
echo      INICIANDO O RETIRO PAY
echo ====================================

echo 1. Compilando o projeto...
cd backend
call npm run build

echo.
echo 2. Iniciando o Servidor e abrindo o navegador...
start http://localhost:3001
call npm run start
pause
