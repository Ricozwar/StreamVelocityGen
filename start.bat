@echo off
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Brak Node.js. Zainstaluj Node.js ze strony https://nodejs.org/ i sprobuj ponownie.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Instaluje zaleznosci...
  call npm install
  if errorlevel 1 (
    echo npm install nie powiodl sie.
    pause
    exit /b 1
  )
)

echo Uruchamiam serwer Vite na http://localhost:3003/
start "StreamVelocityGen - Serwer" cmd /k "npm run dev"

echo Czekam na start serwera...
set /a _tries=0
:wait
set /a _tries+=1
if %_tries% GTR 30 (
  echo Serwer nie wystartowal w oczekiwanym czasie. Sprawdz okno "StreamVelocityGen - Serwer".
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri http://localhost:3003/ -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 goto wait

start http://localhost:3003/
echo Przegladarka otwarta.
