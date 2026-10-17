const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PINGGY_BIN = 'C:\\Users\\RAFLY\\.gemini\\antigravity\\scratch\\tools\\pinggy.exe';
const URL_FILE = path.join(__dirname, '..', 'public-tunnel-url.txt');

function startPinggy() {
  console.log('====================================================');
  console.log('🌐 Starting Pinggy Universal HTTPS Tunnel for Port 3000...');
  console.log('🔒 Protocol: HTTPS (Port 443 Standard - Cross-Network)');
  console.log('====================================================');

  const proc = spawn(PINGGY_BIN, ['-l', '3000', '--v'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);

    // Match assigned URLs
    const matches = text.match(/https:\/\/[a-z0-9\-\.]+\.(?:run\.pinggy-free\.link|free\.pinggy\.net|a\.pinggy\.link)/gi);
    if (matches && matches.length > 0) {
      const url = matches[0];
      console.log('\n🚀 ====================================================');
      console.log(`✨ UNIVERSAL PUBLIC HTTPS URL: ${url}`);
      console.log('✅ Port: 443 (Standard HTTPS - Accessible on any network/cellular)');
      console.log('✅ No Password Warning Page: Direct Access');
      console.log('====================================================\n');

      fs.writeFileSync(URL_FILE, url, 'utf8');
    }
  });

  proc.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString());
  });

  proc.on('close', (code) => {
    console.log(`Pinggy process exited with code ${code}. Reconnecting in 3s...`);
    setTimeout(startPinggy, 3000);
  });
}

startPinggy();
