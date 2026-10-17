const localtunnel = require('localtunnel');
const https = require('https');

function getPassword() {
  return new Promise((resolve) => {
    https.get('https://loca.lt/mytunnelpassword', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', () => {
      // Fallback
      https.get('https://api.ipify.org', (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => resolve(d.trim()));
      }).on('error', () => resolve(''));
    });
  });
}

let activeTunnel = null;

async function start() {
  const password = await getPassword();
  console.log('====================================================');
  console.log('🌐 Starting Public Tunnel for TataDana (Port 3000)...');
  if (password) {
    console.log('🔑 Tunnel Password (IP):', password);
  }
  console.log('====================================================');

  try {
    activeTunnel = await localtunnel({ port: 3000, local_host: '127.0.0.1' });
    console.log('\n🚀 PUBLIC URL:', activeTunnel.url);
    if (password) {
      console.log('🔑 Tunnel Password (IP) jika diminta: ' + password);
    }
    console.log('====================================================\n');

    activeTunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3s...');
      setTimeout(start, 3000);
    });

    activeTunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      if (activeTunnel) activeTunnel.close();
    });
  } catch (err) {
    console.error('Failed to create tunnel:', err.message);
    setTimeout(start, 5000);
  }
}

// Keep process alive explicitly
setInterval(() => {}, 60000);

process.on('SIGINT', () => {
  if (activeTunnel) activeTunnel.close();
  process.exit();
});
process.on('SIGTERM', () => {
  if (activeTunnel) activeTunnel.close();
  process.exit();
});

start();
