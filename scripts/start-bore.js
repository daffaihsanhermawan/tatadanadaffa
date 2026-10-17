const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BORE_BIN = 'C:\\Users\\RAFLY\\.gemini\\antigravity\\scratch\\tools\\bore.exe';

function startBore() {
  console.log('====================================================');
  console.log('🚀 Starting Bore Public Tunnel for TataDana (Port 3000)...');
  console.log('====================================================');

  const proc = spawn(BORE_BIN, ['local', '3000', '--to', 'bore.pub', '--local-host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    const match = text.match(/listening at bore\.pub:(\d+)/i) || text.match(/remote_port=(\d+)/i);
    if (match) {
      const port = match[1];
      const publicUrl = `http://bore.pub:${port}`;
      console.log('\n✨ ====================================================');
      console.log(`🌐 TATA DANA PUBLIC URL: ${publicUrl}`);
      console.log('✨ ====================================================\n');
      fs.writeFileSync(path.join(__dirname, '..', 'public-tunnel-url.txt'), publicUrl, 'utf8');
    }
  });

  proc.stderr.on('data', (chunk) => {
    process.stderr.write(chunk.toString());
  });

  proc.on('close', (code) => {
    console.log(`Bore tunnel exited with code ${code}. Reconnecting in 3 seconds...`);
    setTimeout(startBore, 3000);
  });
}

startBore();
