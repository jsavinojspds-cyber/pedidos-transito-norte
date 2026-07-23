@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================
echo   Carga - Pedidos em Transito (Norte)
echo ================================================
".venv\Scripts\python.exe" "carga_transito.py"
echo.
echo ------------------------------------------------
echo Pode fechar esta janela.
pause
