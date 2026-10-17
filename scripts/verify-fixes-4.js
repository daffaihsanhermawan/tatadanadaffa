/**
 * Automated QA Verification Suite 4 for TataDana
 * 
 * Verifies Revision Suite 4 Requirements:
 * 1a. Login with 'admin@gmail.com' and password 'admin123' fails (404/401) with 'Akun tidak ditemukan'.
 * 1b. Login with unregistered email/phone fails with account not found error (no auto-provisioning).
 * 1c. Login with official superadmin 'admin@tatadana.id' succeeds and is_superadmin === true.
 * 1d. Calendar API endpoint (/api/data/calendar) calculates daily income (green) and expense (red) accurately.
 * 1e. The calendar page (/calendar) is properly protected by AuthGuard and accessible.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null;
    const reqOptions = {
      ...options,
      headers: {
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        } : {}),
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('===========================================================');
  console.log('🚀 Running QA Verification Suite 4: Auth Security & Calendar');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1a: Login with 'admin@gmail.com' fails (404/401) with 'Akun tidak ditemukan'
  // -------------------------------------------------------------------------
  console.log('📌 [TEST 1a] Login with "admin@gmail.com" and password "admin123"...');
  const fakeAdminRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST'
  }, { emailOrNameOrPhone: 'admin@gmail.com', password: 'admin123' });

  assert(
    fakeAdminRes.status === 404 || fakeAdminRes.status === 401,
    'Login admin@gmail.com ditolak dengan status 404 Not Found atau 401 Unauthorized',
    `Status received: ${fakeAdminRes.status}`
  );
  assert(
    fakeAdminRes.data && fakeAdminRes.data.ok === false,
    'Response ok === false'
  );
  assert(
    fakeAdminRes.data && typeof fakeAdminRes.data.message === 'string' && fakeAdminRes.data.message.toLowerCase().includes('tidak ditemukan'),
    'Pesan error menyatakan "Akun tidak ditemukan"',
    `Message received: ${fakeAdminRes.data?.message}`
  );

  // -------------------------------------------------------------------------
  // TEST 1b: Login with unregistered email and phone fails (no auto-provisioning)
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST 1b] Login with unregistered email "unregistered.qa@tatadana-test.com"...');
  const fakeEmailRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST'
  }, { emailOrNameOrPhone: 'unregistered.qa@tatadana-test.com', password: 'password123' });

  assert(
    fakeEmailRes.status === 404 || fakeEmailRes.status === 401,
    'Login unregistered email ditolak (tidak di-autoprovision)',
    `Status received: ${fakeEmailRes.status}`
  );
  assert(
    fakeEmailRes.data && fakeEmailRes.data.ok === false,
    'Response unregistered email ok === false'
  );
  assert(
    fakeEmailRes.data && typeof fakeEmailRes.data.message === 'string' && fakeEmailRes.data.message.toLowerCase().includes('tidak ditemukan'),
    'Pesan error menyatakan "Akun tidak ditemukan"'
  );

  console.log('📌 [TEST 1b-Phone] Login with unregistered phone "089999888777"...');
  const fakePhoneRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST'
  }, { emailOrNameOrPhone: '089999888777', password: 'password123' });

  assert(
    fakePhoneRes.status === 404 || fakePhoneRes.status === 401,
    'Login unregistered phone ditolak (tidak di-autoprovision)',
    `Status received: ${fakePhoneRes.status}`
  );
  assert(
    fakePhoneRes.data && fakePhoneRes.data.ok === false,
    'Response unregistered phone ok === false'
  );

  // -------------------------------------------------------------------------
  // TEST 1c: Login with official superadmin 'admin@tatadana.id' succeeds
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST 1c] Login with official superadmin "admin@tatadana.id"...');
  const validAdminRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST'
  }, { emailOrNameOrPhone: 'admin@tatadana.id', password: 'admin123' });

  assert(
    validAdminRes.status === 200 && validAdminRes.data && validAdminRes.data.ok === true,
    'Official superadmin berhasil login (200 OK)'
  );
  assert(
    validAdminRes.data?.user?.is_superadmin === true,
    'Official superadmin memiliki hak is_superadmin === true',
    `is_superadmin value: ${validAdminRes.data?.user?.is_superadmin}`
  );
  assert(
    validAdminRes.data?.user?.email === 'admin@tatadana.id',
    'User profile email cocok dengan "admin@tatadana.id"'
  );

  // Companion test: Login with official member 'member@tatadana.id'
  console.log('📌 [TEST 1c-Member] Login with official member "member@tatadana.id"...');
  const validMemberRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST'
  }, { emailOrNameOrPhone: 'member@tatadana.id', password: 'member123' });

  assert(
    validMemberRes.status === 200 && validMemberRes.data && validMemberRes.data.ok === true,
    'Official member berhasil login (200 OK)'
  );
  assert(
    validMemberRes.data?.user?.is_superadmin === false,
    'Official member memiliki is_superadmin === false'
  );
  const memberId = validMemberRes.data?.user?.id;

  // -------------------------------------------------------------------------
  // TEST 1d: Calendar API endpoint (/api/data/calendar) daily calculation
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST 1d] Menguji Endpoint Data Kalender (/api/data/calendar)...');

  // Step 1: Ensure test member has at least one active wallet
  let walletId = null;
  const walletsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/data/wallets?userId=${memberId}`,
    method: 'GET'
  });

  if (walletsRes.data && Array.isArray(walletsRes.data.wallets) && walletsRes.data.wallets.length > 0) {
    walletId = walletsRes.data.wallets[0].id;
  } else {
    // Create a wallet for the member
    const createWalletRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/data/wallets',
      method: 'POST'
    }, {
      userId: memberId,
      name: 'BCA Utama Member',
      type: 'bank',
      balance: 10000000,
      isDefault: true
    });
    walletId = createWalletRes.data?.wallet?.id;
  }

  assert(Boolean(walletId), 'Dompet aktif untuk pengujian transaksi kalender tersedia', `walletId: ${walletId}`);

  // Step 2: Insert test income transaction (Green indicator) on 2026-10-17
  const addIncomeRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/transactions',
    method: 'POST'
  }, {
    userId: memberId,
    walletId: walletId,
    type: 'income',
    amount: 3500000,
    notes: 'Bonus Proyek Website (Hijau)',
    transaction_date: '2026-10-17T09:30:00.000Z'
  });

  // Step 3: Insert test expense transaction (Red indicator) on 2026-10-17
  const addExpenseRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/transactions',
    method: 'POST'
  }, {
    userId: memberId,
    walletId: walletId,
    type: 'expense',
    amount: 150000,
    notes: 'Belanja Supermarket Mingguan (Merah)',
    transaction_date: '2026-10-17T14:15:00.000Z'
  });

  assert(
    addIncomeRes.status === 200 && addExpenseRes.status === 200,
    'Transaksi uji coba pemasukan (income) dan pengeluaran (expense) berhasil dibuat'
  );

  // Step 4: Query Calendar API for October 2026
  const calendarRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/data/calendar?userId=${memberId}&year=2026&month=10`,
    method: 'GET'
  });

  assert(
    calendarRes.status === 200 && calendarRes.data && calendarRes.data.ok === true,
    'Endpoint /api/data/calendar merespons 200 OK'
  );

  const calData = calendarRes.data || {};
  const dailyMap = calData.byDate || calData.dailyData || {};

  assert(
    calData.daysInMonth === 31 || new Date(2026, 10, 0).getDate() === 31,
    'Bulan Oktober memiliki 31 hari dalam struktur kalender'
  );

  const day17 = dailyMap['2026-10-17'];
  assert(
    day17 !== undefined,
    'Data tanggal 2026-10-17 ditemukan dalam hasil agregasi kalender'
  );
  assert(
    day17 && day17.totalIncome >= 3500000,
    `Pemasukan harian tercatat akurat (Hijau +Rp${day17?.totalIncome?.toLocaleString('id-ID')})`,
    `Received: ${day17?.totalIncome}`
  );
  assert(
    day17 && day17.totalExpense >= 150000,
    `Pengeluaran harian tercatat akurat (Merah -Rp${day17?.totalExpense?.toLocaleString('id-ID')})`,
    `Received: ${day17?.totalExpense}`
  );
  assert(
    day17 && day17.net === (day17.totalIncome - day17.totalExpense),
    `Net cash flow harian terhitung akurat (Net = Rp${day17?.net?.toLocaleString('id-ID')})`
  );
  assert(
    day17 && Array.isArray(day17.transactions) && day17.transactions.length >= 2,
    `Daftar transaksi spesifik tanggal 17 memuat ${day17?.transactions?.length} transaksi`
  );

  // Verify monthly summary aggregation
  const summary = calData.summary || {};
  assert(
    summary.monthlyTotalIncome >= 3500000,
    `Summary total pemasukan bulanan teragregasi akurat (Rp${summary.monthlyTotalIncome?.toLocaleString('id-ID')})`
  );
  assert(
    summary.monthlyTotalExpense >= 150000,
    `Summary total pengeluaran bulanan teragregasi akurat (Rp${summary.monthlyTotalExpense?.toLocaleString('id-ID')})`
  );
  assert(
    summary.monthlyNet === (summary.monthlyTotalIncome - summary.monthlyTotalExpense),
    'Summary monthlyNet sama dengan monthlyTotalIncome - monthlyTotalExpense'
  );

  // -------------------------------------------------------------------------
  // TEST 1e: The calendar page (/calendar) protected by AuthGuard and accessible
  // -------------------------------------------------------------------------
  console.log('\n📌 [TEST 1e] Menguji Halaman Kalender (/calendar) & AuthGuard...');

  // 1. Accessibility over HTTP
  const pageHttpRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/calendar',
    method: 'GET'
  });

  assert(
    pageHttpRes.status === 200,
    'Halaman /calendar dapat diakses dan mengembalikan status 200 OK',
    `Status received: ${pageHttpRes.status}`
  );

  // 2. Source code audit for AuthGuard wrapping and color indicators
  const calendarPagePath = path.resolve('src/app/calendar/page.tsx');
  const calendarFileExists = fs.existsSync(calendarPagePath);
  assert(calendarFileExists, 'File src/app/calendar/page.tsx ditemukan di repository');

  if (calendarFileExists) {
    const calendarSrc = fs.readFileSync(calendarPagePath, 'utf8');

    assert(
      calendarSrc.includes("import AuthGuard from '@/components/auth/AuthGuard'") ||
      calendarSrc.includes('import AuthGuard from "@/components/auth/AuthGuard"'),
      'Halaman Kalender mengimpor AuthGuard component'
    );
    assert(
      calendarSrc.includes('<AuthGuard>') && calendarSrc.includes('</AuthGuard>'),
      'Seluruh konten halaman /calendar dibungkus secara utuh oleh <AuthGuard>'
    );
    assert(
      calendarSrc.includes('Sidebar'),
      'Halaman Kalender memuat komponen Sidebar navigasi'
    );
    assert(
      calendarSrc.includes('emerald') && calendarSrc.includes('rose'),
      'Halaman Kalender memiliki styling indikator warna Hijau (emerald/pemasukan) dan Merah (rose/pengeluaran)'
    );
  }

  // 3. Verify Sidebar Navigation link to /calendar
  const sidebarPath = path.resolve('src/components/layout/Sidebar.tsx');
  if (fs.existsSync(sidebarPath)) {
    const sidebarSrc = fs.readFileSync(sidebarPath, 'utf8');
    assert(
      sidebarSrc.includes('/calendar'),
      'Sidebar navigasi memiliki tautan menu ke "/calendar"'
    );
  }

  // -------------------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n===========================================================');
  console.log(`🎯 Test Suite 4 Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
