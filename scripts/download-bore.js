const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetZip = 'C:\\Users\\RAFLY\\.gemini\\antigravity\\scratch\\tools\\bore.zip';
const targetDir = 'C:\\Users\\RAFLY\\.gemini\\antigravity\\scratch\\tools';

function download(url) {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log('Redirecting to:', res.headers.location);
      return download(res.headers.location);
    }
    if (res.statusCode !== 200) {
      console.error('Download failed with status:', res.statusCode);
      process.exit(1);
    }
    const file = fs.createWriteStream(targetZip);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Downloaded bore.zip. Extracting...');
      try {
        execSync(`tar -xf "${targetZip}" -C "${targetDir}"`);
        console.log('Extracted bore.exe successfully!');
        if (fs.existsSync(targetZip)) fs.unlinkSync(targetZip);
      } catch (err) {
        console.error('Extraction error:', err.message);
      }
    });
  }).on('error', (e) => {
    console.error('Download error:', e.message);
  });
}

download('https://github.com/ekzhang/bore/releases/download/v0.5.1/bore-v0.5.1-x86_64-pc-windows-msvc.zip');
