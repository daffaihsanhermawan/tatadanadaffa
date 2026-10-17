const https = require('https');

const req = https.get('https://sour-teams-create.loca.lt', {
  headers: {
    'bypass-tunnel-reminder': 'true',
    'User-Agent': 'Mozilla/5.0'
  },
  timeout: 10000
}, (res) => {
  console.log('HTTP STATUS:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('TITLE:', data.match(/<title>(.*?)<\/title>/i)?.[1] || 'No title found');
    console.log('LENGTH:', data.length);
    process.exit(0);
  });
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
  process.exit(1);
});

req.on('error', (err) => {
  console.error('Request failed:', err.message);
  process.exit(1);
});
