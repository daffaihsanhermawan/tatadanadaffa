const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const urlFile = path.join(__dirname, '..', 'public-tunnel-url.txt');
const baseUrl = fs.readFileSync(urlFile, 'utf8').trim();

console.log('Testing Public URL:', baseUrl);

function curl(url, options = {}) {
  const method = options.method || 'GET';
  let cmd = `curl.exe -s -X ${method}`;
  if (options.data) {
    const escaped = options.data.replace(/"/g, '\\"');
    cmd += ` -H "Content-Type: application/json" -d "${escaped}"`;
  }
  cmd += ` "${url}"`;
  try {
    const stdout = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
    return stdout;
  } catch (e) {
    return 'ERROR: ' + e.message;
  }
}

async function run() {
  console.log('\n--- 1. Testing Landing Page ---');
  const landing = curl(`${baseUrl}/`);
  console.log('Landing contains TataDana:', landing.includes('TataDana'));

  console.log('\n--- 2. Testing Login Superadmin ---');
  const adminRes = curl(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    data: JSON.stringify({ email: 'admin@tatadana.id', password: 'admin123' })
  });
  console.log('Admin login response:', adminRes);

  console.log('\n--- 3. Testing Login Member ---');
  const memberRes = curl(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    data: JSON.stringify({ email: 'member@tatadana.id', password: 'member123' })
  });
  console.log('Member login response:', memberRes);

  console.log('\n--- 4. Testing WhatsApp Registration Request ---');
  const regRes = curl(`${baseUrl}/api/auth/register-request`, {
    method: 'POST',
    data: JSON.stringify({
      fullName: 'Budi Tester Publik',
      phoneNumber: '089888777666',
      email: 'budipublik@gmail.com',
      password: 'password123'
    })
  });
  console.log('Registration response:', regRes);

  console.log('\n--- 5. Testing Calendar API ---');
  const calRes = curl(`${baseUrl}/api/data/calendar?userId=user-member-1&year=2026&month=10`);
  console.log('Calendar response:', calRes.slice(0, 150) + '...');

  console.log('\n--- 6. Testing AI Simulation Route ---');
  const aiRes = curl(`${baseUrl}/api/telegram/simulate`, {
    method: 'POST',
    data: JSON.stringify({
      message: 'beli bensin 50rb gopay tanggal 15 oktober',
      userId: 'user-member-1'
    })
  });
  console.log('AI Simulation response:', aiRes);
}

run();
