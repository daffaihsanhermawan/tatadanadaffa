@echo off
title Hentikan TataDana
echo ====================================================
echo  Menghentikan Seluruh Layanan TataDana...
echo ====================================================
powershell -NoProfile -Command "Get-Process pinggy -ErrorAction SilentlyContinue | Stop-Process -Force; Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*next start*' -or $_.CommandLine -like '*start-pinggy*' -or $_.CommandLine -like '*start-poller*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
echo.
echo [OK] Layanan TataDana berhasil dihentikan.
echo.
pause
