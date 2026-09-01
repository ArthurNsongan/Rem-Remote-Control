@echo off
REM Lance le serveur REM (Python). Installe les deps au 1er lancement.
cd /d "%~dp0"
python -c "import aiohttp, pyautogui" 2>nul || python -m pip install -r requirements.txt
python rem_server.py %*
