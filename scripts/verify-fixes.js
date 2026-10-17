const http = require('http');

function postJson(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'GET'
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING TATADANA 6-POINT VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  // TEST 1: Login with "Wildan Ganteng"
  console.log('[TEST 1] Login dengan nama "Wildan Ganteng"...');
  try {
    const res = await postJson('/api/auth/login', { emailOrNameOrPhone: 'Wildan Ganteng' });
    if (res.status === 200 && res.data.ok && res.data.user.full_name === 'Wildan Ganteng') {
      console.log('  ✅ PASSED: Akun "Wildan Ganteng" berhasil dikenali dan dibuat dengan ID:', res.data.user.id);
      console.log('  Role is_superadmin:', res.data.user.is_superadmin);
      passed++;
    } else {
      console.error('  ❌ FAILED:', res);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ FAILED with error:', err.message);
    failed++;
  }

  // TEST 2: Login with Superadmin
  console.log('\n[TEST 2] Login dengan Superadmin "admin@tatadana.id"...');
  try {
    const res = await postJson('/api/auth/login', { emailOrNameOrPhone: 'admin@tatadana.id', password: 'admin' });
    if (res.status === 200 && res.data.ok && res.data.user.is_superadmin === true) {
      console.log('  ✅ PASSED: Akun Superadmin berhasil login dengan is_superadmin: true');
      passed++;
    } else {
      console.error('  ❌ FAILED:', res);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ FAILED with error:', err.message);
    failed++;
  }

  // TEST 3: TataDana AI Popup / Simulate Transaction
  console.log('\n[TEST 3] Catat transaksi "beli bakso 15rb" via TataDana AI untuk Wildan Ganteng...');
  try {
    const loginRes = await postJson('/api/auth/login', { emailOrNameOrPhone: 'Wildan Ganteng' });
    const wildanId = loginRes.data.user.id;

    const simRes = await postJson('/api/telegram/simulate', {
      text: 'beli bakso 15rb',
      userId: wildanId
    });

    if (simRes.status === 200 && simRes.data.ok && simRes.data.parsed.nominal === 15000) {
      console.log('  ✅ PASSED: Parsing "beli bakso 15rb" -> Rp15.000');
      console.log('  Bot Reply Preview:\n  ' + simRes.data.reply.split('\n').join('\n  '));
      passed++;
    } else {
      console.error('  ❌ FAILED:', simRes);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ FAILED with error:', err.message);
    failed++;
  }

  // TEST 4: Date Filter in Transactions / Laporan API
  console.log('\n[TEST 4] Test Filter Tanggal (startDate & endDate)...');
  try {
    const loginRes = await postJson('/api/auth/login', { emailOrNameOrPhone: 'Wildan Ganteng' });
    const wildanId = loginRes.data.user.id;

    // Get today in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const resAll = await getJson(`/api/data/transactions?userId=${wildanId}&startDate=${today}&endDate=${today}`);
    
    if (resAll.status === 200 && resAll.data.ok && Array.isArray(resAll.data.transactions)) {
      console.log(`  ✅ PASSED: Filter transaksi hari ini (${today}) mengembalikan ${resAll.data.transactions.length} transaksi`);
      passed++;
    } else {
      console.error('  ❌ FAILED:', resAll);
      failed++;
    }

    // Past date filter (yesterday) should return 0 for new user
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const resPast = await getJson(`/api/data/transactions?userId=${wildanId}&startDate=${yesterday}&endDate=${yesterday}`);
    if (resPast.status === 200 && resPast.data.transactions.length === 0) {
      console.log(`  ✅ PASSED: Filter tanggal kemarin (${yesterday}) mengembalikan 0 transaksi secara akurat.`);
      passed++;
    } else {
      console.error('  ❌ FAILED:', resPast);
      failed++;
    }
  } catch (err) {
    console.error('  ❌ FAILED with error:', err.message);
    failed++;
  }

  // TEST 5: Verify Source Files Conformity
  console.log('\n[TEST 5] Verifikasi file UI & role restriction...');
  const fs = require('fs');
  const loginSrc = fs.readFileSync('src/app/auth/login/page.tsx', 'utf8');
  const landingSrc = fs.readFileSync('src/app/page.tsx', 'utf8');
  const sidebarSrc = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');
  const laporanSrc = fs.readFileSync('src/app/laporan/page.tsx', 'utf8');
  const floatingSrc = fs.readFileSync('src/components/chat/FloatingAIBot.tsx', 'utf8');

  // Check login page does NOT have Akun Uji Coba Cepat
  if (!loginSrc.includes('Akun Uji Coba Cepat') && !loginSrc.includes('handleQuickLogin')) {
    console.log('  ✅ PASSED: Halaman Login bebas dari "Akun Uji Coba Cepat".');
    passed++;
  } else {
    console.error('  ❌ FAILED: Login page still contains Akun Uji Coba Cepat');
    failed++;
  }

  // Check landing page does NOT have interactive chat input in demo
  if (!landingSrc.includes('placeholder="Ketik transaksimu..."')) {
    console.log('  ✅ PASSED: Halaman Landing Page (localhost:3000) tidak memiliki input interaktif chat AI simulator.');
    passed++;
  } else {
    console.error('  ❌ FAILED: Landing page still has chat input');
    failed++;
  }

  // Check sidebar only shows Portal Superadmin when isSuperAdmin is true
  if (sidebarSrc.includes('isSuperAdmin &&') || sidebarSrc.includes('user?.is_superadmin')) {
    console.log('  ✅ PASSED: Sidebar menyembunyikan "Portal Superadmin" untuk Member.');
    passed++;
  } else {
    console.error('  ❌ FAILED: Sidebar missing isSuperAdmin check');
    failed++;
  }

  // Check laporan page has date inputs
  if (laporanSrc.includes('type="date"') && laporanSrc.includes('setQuickDatePreset')) {
    console.log('  ✅ PASSED: Halaman Laporan memiliki kontrol filter tanggal kustom dan preset cepat.');
    passed++;
  } else {
    console.error('  ❌ FAILED: Laporan page missing date filter inputs');
    failed++;
  }

  // Check FloatingAIBot has floating bottom-right placement and simulate endpoint
  if (floatingSrc.includes('fixed bottom-6 right-6') && floatingSrc.includes('/api/telegram/simulate')) {
    console.log('  ✅ PASSED: Komponen FloatingAIBot popup di pojok kanan bawah siap digunakan.');
    passed++;
  } else {
    console.error('  ❌ FAILED: FloatingAIBot missing proper placement or API call');
    failed++;
  }

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runTests();
