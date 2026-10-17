Set WshShell = CreateObject("WScript.Shell")
appDir = "C:\Users\RAFLY\.gemini\antigravity\scratch\tatadana"
nodeExe = "C:\Users\RAFLY\.gemini\antigravity\scratch\tools\node\node.exe"

WshShell.CurrentDirectory = appDir

' 1. Start Next.js production server in background (0 = hidden)
WshShell.Run "cmd /c """ & nodeExe & """ node_modules/next/dist/bin/next start -p 3000 > server.log 2>&1", 0, False
WScript.Sleep 2000

' 2. Start Telegram bot poller in background (0 = hidden)
WshShell.Run "cmd /c """ & nodeExe & """ scripts/start-poller.js > poller.log 2>&1", 0, False

' 3. Start Pinggy Universal HTTPS Tunnel in background (0 = hidden)
WshShell.Run "cmd /c """ & nodeExe & """ scripts/start-pinggy.js > tunnel.log 2>&1", 0, False

' 4. Tunggu tunnel meng-generate public URL lalu buka browser
WScript.Sleep 4000
WshShell.Run "cmd /c ""C:\Users\RAFLY\Desktop\TataDana - Buka Website.bat""", 1, False
