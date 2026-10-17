@echo off
title TataDana - Buka Website Publik
set "URL_FILE=C:\Users\RAFLY\.gemini\antigravity\scratch\tatadana\public-tunnel-url.txt"

if exist "%URL_FILE%" (
    set /p PUBLIC_URL=<"%URL_FILE%"
    echo Membuka URL TataDana: %PUBLIC_URL%
    start "" "%PUBLIC_URL%"
) else (
    echo File public-tunnel-url.txt belum ditemukan. Membuka localhost:3000...
    start "" http://localhost:3000
)
