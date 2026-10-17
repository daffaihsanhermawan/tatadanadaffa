/**
 * Automated QA Verification Test Suite 5 for TataDana
 * 
 * Requirements Tested:
 * 1a. TataDana AI Natural Language Date Adjustment:
 *     - Send "Beli iPhone 20jt tanggal 14 oktober" to POST /api/telegram/simulate.
 *     - Assert parser extracts nominal 20000000, type 'pengeluaran', and date containing '2026-10-14'.
 *     - Assert transaction is stored with transaction_date in '2026-10-14'.
 *     - Query GET /api/data/calendar?userId=...&year=2026&month=10, assert date '2026-10-14' shows expense >= 20000000 (red badge).
 * 1b. Income with date:
 *     - Send "Gajian 15jt tgl 1 okt bca" to POST /api/telegram/simulate.
 *     - Assert date is '2026-10-01', wallet is BCA, and income is recorded.
 *     - Query GET /api/data/calendar, assert date '2026-10-01' shows income >= 15000000 (green badge).
 * 1c. Default date (Today):
 *     - Send "Beli bakso 15rb" (no date specified).
 *     - Assert transaction_date is today.
 * 1d. Manual Transaction Page Date Picker:
 *     - Verify 'src/app/transactions/page.tsx' contains date picker input with default today value.
 *     - Post transaction with custom date to POST /api/data/transactions and verify it appears on that date in calendar & tx list.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition, message, details = '') {
  if (condition) {
    console.log(`  ${GREEN}✔ PASS:${RESET} ${message}`);
    passed++;
  } else {
    console.error(`  ${RED}✖ FAIL:${RESET} ${message}`);
    if (details) console.error(`    ${RED}Details:${RESET} ${details}`);
    failed++;
  }
}

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

function getTodayWIBString() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7));
  const y = wib.getFullYear();
  const m = String(wib.getMonth() + 1).padStart(2, '0');
  const d = String(wib.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function runTestSuite() {
  console.log(`${CYAN}==============================================================================${RESET}`);
  console.log(`${CYAN}TATADANA QA VERIFICATION SUITE 5: NATURAL DATE PARSING & DATE PICKER${RESET}`);
  console.log(`${CYAN}==============================================================================${RESET}\n`);

  try {
    // --------------------------------------------------------------------------
    // SETUP: Authenticate Official Test Member & Verify Wallets
    // --------------------------------------------------------------------------
    console.log(`${YELLOW}[SETUP] Login Official Member & Synchronize Active Telegram User...${RESET}`);
    const loginRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST'
    }, { emailOrNameOrPhone: 'member@tatadana.id', password: 'member123' });

    assert(
      loginRes.status === 200 && loginRes.data && loginRes.data.ok === true,
      'Login member@tatadana.id berhasil (200 OK)',
      JSON.stringify(loginRes.data)
    );
    const userId = loginRes.data?.user?.id || 'user-member-tatadana';

    // Synchronize active Telegram user
    await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/telegram/active-user',
      method: 'POST'
    }, { userId });

    // Fetch user wallets
    const walletsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/data/wallets?userId=${userId}`,
      method: 'GET'
    });
    let userWallets = walletsRes.data?.wallets || [];
    let bcaWallet = userWallets.find(w => w.name.toLowerCase().includes('bca')) || userWallets[0];

    if (!bcaWallet) {
      const createWRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/data/wallets',
        method: 'POST'
      }, {
        userId,
        name: 'BCA Utama Member',
        type: 'bank',
        balance: 10000000,
        isDefault: true
      });
      bcaWallet = createWRes.data?.wallet;
      userWallets = [bcaWallet];
    }

    assert(Boolean(bcaWallet), `User memiliki dompet aktif (${bcaWallet?.name})`);

    // --------------------------------------------------------------------------
    // TEST 1a: TataDana AI Natural Language Date Adjustment (Expense with Date)
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 1a] Natural Language: 'Beli iPhone 20jt tanggal 14 oktober'${RESET}`);
    const simExpenseRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/telegram/simulate',
      method: 'POST'
    }, {
      text: 'Beli iPhone 20jt tanggal 14 oktober',
      userId
    });

    assert(
      simExpenseRes.status === 200 && simExpenseRes.data && simExpenseRes.data.ok === true,
      'Endpoint simulate menerima pesan transaksi iPhone dengan tanggal',
      JSON.stringify(simExpenseRes.data)
    );

    const parsedExpense = simExpenseRes.data?.parsed || {};
    assert(
      Number(parsedExpense.nominal) === 20000000,
      'Parser mengekstrak nominal 20.000.000 (20jt)',
      `Nominal parsed: ${parsedExpense.nominal}`
    );
    assert(
      parsedExpense.jenis === 'pengeluaran',
      'Parser mendeteksi jenis transaksi "pengeluaran"',
      `Jenis parsed: ${parsedExpense.jenis}`
    );

    const dateExtracted = parsedExpense.date || parsedExpense.tanggal || '';
    assert(
      typeof dateExtracted === 'string' && dateExtracted.includes('2026-10-14'),
      'Parser mengekstrak tanggal mengandung "2026-10-14"',
      `Date parsed: ${dateExtracted}`
    );

    // Verify stored transaction in transactions list
    const txListRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/data/transactions?userId=${userId}`,
      method: 'GET'
    });
    const txList = txListRes.data?.transactions || [];
    const iphoneTx = txList.find(t => 
      t.amount === 20000000 && 
      ((t.notes && t.notes.toLowerCase().includes('iphone')) || t.source === 'telegram_text')
    );
    assert(
      Boolean(iphoneTx),
      'Transaksi iPhone 20jt tersimpan di database transaksi pengguna'
    );
    assert(
      iphoneTx && iphoneTx.transaction_date.includes('2026-10-14'),
      'Field transaction_date transaksi tersimpan tepat di tanggal "2026-10-14"',
      `Stored transaction_date: ${iphoneTx?.transaction_date}`
    );

    // Verify Calendar API for October 2026
    const calendarRes1 = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/data/calendar?userId=${userId}&year=2026&month=10`,
      method: 'GET'
    });
    assert(
      calendarRes1.status === 200 && calendarRes1.data && calendarRes1.data.ok === true,
      'Endpoint /api/data/calendar merespons 200 OK untuk bulan Oktober 2026'
    );

    const byDate1 = calendarRes1.data?.byDate || calendarRes1.data?.dailyData || {};
    const day14 = byDate1['2026-10-14'];
    assert(
      Boolean(day14),
      'Entri tanggal 2026-10-14 ditemukan dalam data kalender keuangan'
    );
    assert(
      day14 && day14.totalExpense >= 20000000,
      `Tanggal 2026-10-14 menampilkan badge pengeluaran merah >= Rp20.000.000 (Aktual: Rp${day14?.totalExpense?.toLocaleString('id-ID')})`,
      `Total expense: ${day14?.totalExpense}`
    );

    // --------------------------------------------------------------------------
    // TEST 1b: Income with Date & BCA Wallet Detection
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 1b] Natural Language: 'Gajian 15jt tgl 1 okt bca'${RESET}`);
    const simIncomeRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/telegram/simulate',
      method: 'POST'
    }, {
      text: 'Gajian 15jt tgl 1 okt bca',
      userId
    });

    assert(
      simIncomeRes.status === 200 && simIncomeRes.data && simIncomeRes.data.ok === true,
      'Endpoint simulate menerima pesan pemasukan gaji dengan tanggal dan dompet',
      JSON.stringify(simIncomeRes.data)
    );

    const parsedIncome = simIncomeRes.data?.parsed || {};
    assert(
      Number(parsedIncome.nominal) === 15000000,
      'Parser mengekstrak nominal 15.000.000 (15jt)',
      `Nominal parsed: ${parsedIncome.nominal}`
    );
    assert(
      parsedIncome.jenis === 'pemasukan',
      'Parser mendeteksi jenis transaksi "pemasukan"',
      `Jenis parsed: ${parsedIncome.jenis}`
    );

    const incomeDateExtracted = parsedIncome.date || parsedIncome.tanggal || '';
    assert(
      typeof incomeDateExtracted === 'string' && incomeDateExtracted.includes('2026-10-01'),
      'Parser mengekstrak tanggal pemasukan tepat "2026-10-01"',
      `Date parsed: ${incomeDateExtracted}`
    );
    assert(
      parsedIncome.dompet && parsedIncome.dompet.toLowerCase().includes('bca'),
      'Parser mendeteksi metode pembayaran / dompet = "bca"',
      `Dompet parsed: ${parsedIncome.dompet}`
    );

    // Check calendar for October 1st income badge
    const calendarRes2 = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/data/calendar?userId=${userId}&year=2026&month=10`,
      method: 'GET'
    });
    const byDate2 = calendarRes2.data?.byDate || calendarRes2.data?.dailyData || {};
    const day01 = byDate2['2026-10-01'];
    assert(
      Boolean(day01),
      'Entri tanggal 2026-10-01 ditemukan dalam kalender'
    );
    assert(
      day01 && day01.totalIncome >= 15000000,
      `Tanggal 2026-10-01 menampilkan badge pemasukan hijau >= Rp15.000.000 (Aktual: Rp${day01?.totalIncome?.toLocaleString('id-ID')})`,
      `Total income: ${day01?.totalIncome}`
    );

    // --------------------------------------------------------------------------
    // TEST 1c: Default Date (Today) When Date is Omitted
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 1c] Natural Language Without Date: 'Beli bakso 15rb' (Default Today)${RESET}`);
    const simTodayRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/telegram/simulate',
      method: 'POST'
    }, {
      text: 'Beli bakso 15rb',
      userId
    });

    assert(
      simTodayRes.status === 200 && simTodayRes.data && simTodayRes.data.ok === true,
      'Endpoint simulate menerima pesan transaksi tanpa tanggal spesifik'
    );
    assert(
      Number(simTodayRes.data?.parsed?.nominal) === 15000,
      'Parser nominal bakso 15rb -> 15.000'
    );

    const todayDateWIB = getTodayWIBString();
    const updatedTxRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/data/transactions?userId=${userId}`,
      method: 'GET'
    });
    const allUserTx = updatedTxRes.data?.transactions || [];
    const baksoTx = allUserTx.find(t => t.amount === 15000 && (t.notes || '').toLowerCase().includes('bakso'));

    assert(
      Boolean(baksoTx),
      'Transaksi bakso 15rb tersimpan di daftar transaksi pengguna'
    );
    assert(
      baksoTx && baksoTx.transaction_date.includes(todayDateWIB),
      `Transaksi tanpa tanggal otomatis memakai tanggal hari ini (${todayDateWIB})`,
      `Actual transaction_date: ${baksoTx?.transaction_date}`
    );

    // --------------------------------------------------------------------------
    // TEST 1d: Manual Transaction Page Date Picker (UI Code Audit & API POST)
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 1d] Manual Transaction Page Date Picker Verification${RESET}`);

    // Part 1: Source code audit of 'src/app/transactions/page.tsx'
    const txPagePath = path.resolve(process.cwd(), 'src/app/transactions/page.tsx');
    assert(
      fs.existsSync(txPagePath),
      'File src/app/transactions/page.tsx ditemukan di repository'
    );

    const txPageSrc = fs.readFileSync(txPagePath, 'utf8');
    assert(
      txPageSrc.includes('type="date"') || txPageSrc.includes("type='date'"),
      'Halaman transaksi memuat komponen input HTML date picker (type="date")'
    );
    assert(
      txPageSrc.includes('transactionDate') || txPageSrc.includes('transaction_date') || txPageSrc.includes('selectedDate'),
      'Halaman transaksi memiliki state penampung tanggal transaksi terpilih'
    );
    assert(
      txPageSrc.includes('toWIBDateString') || txPageSrc.includes('toISOString().split') || txPageSrc.includes('new Date()'),
      'Halaman transaksi menginisialisasi input tanggal dengan nilai default hari ini'
    );

    // Part 2: POST custom date to /api/data/transactions
    console.log('  Submitting custom-dated transaction to POST /api/data/transactions...');
    const customDateIso = '2026-10-25T14:30:00.000Z';
    const customPostRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/data/transactions',
      method: 'POST'
    }, {
      userId,
      walletId: bcaWallet.id,
      type: 'expense',
      amount: 85000,
      notes: 'Belanja custom date QA Test 5',
      transactionDate: customDateIso
    });

    assert(
      customPostRes.status === 200 && customPostRes.data && customPostRes.data.ok === true,
      'API POST /api/data/transactions berhasil membuat transaksi manual dengan custom date'
    );
    const createdTx = customPostRes.data?.transaction;
    assert(
      createdTx && createdTx.transaction_date.includes('2026-10-25'),
      'Objek transaksi tersimpan mengembalikan transaction_date di "2026-10-25"',
      `Stored date: ${createdTx?.transaction_date}`
    );

    // Part 3: Verify custom date appears in Calendar aggregation
    const calendarRes3 = await request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/data/calendar?userId=${userId}&year=2026&month=10`,
      method: 'GET'
    });
    const byDate3 = calendarRes3.data?.byDate || calendarRes3.data?.dailyData || {};
    const day25 = byDate3['2026-10-25'];
    assert(
      Boolean(day25),
      'Entri tanggal 2026-10-25 ditemukan dalam data kalender'
    );
    assert(
      day25 && day25.totalExpense >= 85000,
      `Transaksi manual custom date tampil akurat pada kalender 2026-10-25 (Expense: Rp${day25?.totalExpense?.toLocaleString('id-ID')})`,
      `Day 25 expense: ${day25?.totalExpense}`
    );

  } catch (err) {
    console.error(`\n${RED}Unexpected runtime error in test suite:${RESET}`, err);
    failed++;
  }

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  const total = passed + failed;
  console.log(`\n${CYAN}==============================================================================${RESET}`);
  console.log(`${CYAN}TEST SUITE 5 SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)${RESET}`);
  if (failed === 0) {
    console.log(`${GREEN}SELURUH PENGUJIAN OTOMATIS SUITE 5 BERHASIL (100% PASS)!${RESET}`);
  } else {
    console.log(`${RED}ADA ${failed} PENGUJIAN YANG GAGAL. SILAKAN CEK DETAIL DI ATAS.${RESET}`);
  }
  console.log(`${CYAN}==============================================================================${RESET}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
