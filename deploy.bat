@echo off
REM Déploie la landing Rem sur Vercel (production). Double-clic ou : deploy.bat
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -Prod %*
