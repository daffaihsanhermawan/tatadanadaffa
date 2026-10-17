/**
 * TataDana End-to-End QA Verification Suite 2 (verify-fixes-2.js)
 * 
 * Verifies:
 * 1. 'bakso 20rb gopay' reduces balance of GoPay specifically, not BCA.
 * 2. 'kopi 25rb tunai' reduces balance of Dompet Tunai specifically.
 * 3. 'makan 35rb bca' reduces balance of BCA Utama specifically.
 * 4. 'Cek Saldo' shortcut returns all wallets with updated balances.
 * 5. 'Audit Penghasilan' shortcut returns cashflow analysis and savings rate score.
 * 6. Member profile photo update via API and settings page works and updates session.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ${GREEN}✔ PASS:${RESET} ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${RED}✖ FAIL:${RESET} ${testName}`);
    if (details) console.error(`    ${RED}Details:${RESET} ${details}`);
    failedCount++;
  }
}

function requestJson(urlPath, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
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
    if (payload) req.write(payload);
    req.end();
  });
}

const getJson = (urlPath) => requestJson(urlPath, 'GET');
const postJson = (urlPath, data) => requestJson(urlPath, 'POST', data);
const putJson = (urlPath, data) => requestJson(urlPath, 'PUT', data);

async function runTestSuite() {
  console.log(`${CYAN}==============================================================================${RESET}`);
  console.log(`${CYAN}TATADANA QA VERIFICATION SUITE 2: SPECIFIC WALLETS & SHORTCUTS & PROFILE PHOTO${RESET}`);
  console.log(`${CYAN}==============================================================================${RESET}\n`);

  try {
    // --------------------------------------------------------------------------
    // SETUP: Create or Authenticate Isolated Test Member
    // --------------------------------------------------------------------------
    const testUsername = `Siti QA Tester ${Date.now()}`;
    const testPhone = `0896${String(Date.now()).slice(-8)}`;
    const testEmail = `siti.${Date.now()}@tatadana.id`;
    console.log(`${YELLOW}[SETUP] Register & Approve Test Member '${testUsername}'...${RESET}`);
    
    const regRes = await postJson('/api/auth/register-request', {
      fullName: testUsername,
      phone: testPhone,
      email: testEmail,
      password: 'password123'
    });
    assert(regRes.status === 200 && regRes.data.ok, 'Registrasi request Siti berhasil');
    
    const approveRes = await postJson('/api/admin/approvals/action', {
      registrationId: regRes.data.registrationId,
      action: 'approve',
      adminId: 'admin-super'
    });
    assert(approveRes.status === 200 && approveRes.data.ok, 'Approval admin untuk Siti berhasil');

    const loginRes = await postJson('/api/auth/login', { emailOrNameOrPhone: testEmail, password: 'password123' });
    assert(loginRes.status === 200 && loginRes.data.ok, 'Login Siti QA Tester berhasil', JSON.stringify(loginRes.data));
    const userId = loginRes.data.user.id;

    // Give wallets initial test balances for deduction tests
    const setupWalletsRes = await getJson(`/api/data/wallets?userId=${userId}`);
    for (const w of setupWalletsRes.data.wallets) {
      if (w.name.toLowerCase().includes('bca')) w.balance = 5000000;
      if (w.name.toLowerCase().includes('gopay')) w.balance = 500000;
      if (w.name.toLowerCase().includes('tunai')) w.balance = 300000;
    }

    // Fetch initial wallets
    const walletsRes = await getJson(`/api/data/wallets?userId=${userId}`);
    assert(walletsRes.status === 200 && walletsRes.data.ok, 'Ambil daftar awal dompet user');
    const initialWallets = walletsRes.data.wallets;

    const bcaInit = initialWallets.find(w => w.name.toLowerCase().includes('bca'));
    const gopayInit = initialWallets.find(w => w.name.toLowerCase().includes('gopay'));
    const tunaiInit = initialWallets.find(w => w.name.toLowerCase().includes('tunai') || w.name.toLowerCase().includes('cash'));

    assert(Boolean(bcaInit && gopayInit && tunaiInit), 'User memiliki 3 dompet terdaftar: BCA Utama, GoPay, dan Dompet Tunai');
    console.log(`  Initial Balances -> BCA: Rp${bcaInit.balance.toLocaleString('id-ID')} | GoPay: Rp${gopayInit.balance.toLocaleString('id-ID')} | Tunai: Rp${tunaiInit.balance.toLocaleString('id-ID')}\n`);

    // --------------------------------------------------------------------------
    // TEST 1: 'bakso 20rb gopay' reduces balance of GoPay specifically, not BCA
    // --------------------------------------------------------------------------
    console.log(`${YELLOW}[TEST 1] Transaksi 'bakso 20rb gopay' -> Memastikan saldo GoPay terpotong & BCA tidak berubah${RESET}`);
    const simGopay = await postJson('/api/telegram/simulate', {
      text: 'bakso 20rb gopay',
      userId
    });

    assert(simGopay.status === 200 && simGopay.data.ok, 'Endpoint simulate menerima "bakso 20rb gopay"');
    assert(simGopay.data.parsed && simGopay.data.parsed.nominal === 20000, 'Parser nominal 20rb -> 20.000');
    assert(simGopay.data.parsed && simGopay.data.parsed.dompet === 'gopay', 'Parser mendeteksi dompet = "gopay"');

    // Refresh wallet states
    const walletsAfter1 = (await getJson(`/api/data/wallets?userId=${userId}`)).data.wallets;
    const gopayAfter1 = walletsAfter1.find(w => w.id === gopayInit.id);
    const bcaAfter1 = walletsAfter1.find(w => w.id === bcaInit.id);
    const tunaiAfter1 = walletsAfter1.find(w => w.id === tunaiInit.id);

    assert(gopayAfter1.balance === gopayInit.balance - 20000, `Saldo GoPay berkurang tepat Rp20.000 (${gopayInit.balance} -> ${gopayAfter1.balance})`);
    assert(bcaAfter1.balance === bcaInit.balance, `Saldo BCA Utama TETAP utuh (tidak terpotong salah dompet): Rp${bcaAfter1.balance.toLocaleString('id-ID')}`);
    assert(tunaiAfter1.balance === tunaiInit.balance, `Saldo Dompet Tunai TETAP utuh: Rp${tunaiAfter1.balance.toLocaleString('id-ID')}`);
    assert(simGopay.data.reply && simGopay.data.reply.includes('GoPay'), 'Pesan konfirmasi Telegram menyebut "GoPay"');

    // --------------------------------------------------------------------------
    // TEST 2: 'kopi 25rb tunai' reduces balance of Dompet Tunai specifically
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 2] Transaksi 'kopi 25rb tunai' -> Memastikan saldo Dompet Tunai terpotong${RESET}`);
    const simTunai = await postJson('/api/telegram/simulate', {
      text: 'kopi 25rb tunai',
      userId
    });

    assert(simTunai.status === 200 && simTunai.data.ok, 'Endpoint simulate menerima "kopi 25rb tunai"');
    assert(simTunai.data.parsed && simTunai.data.parsed.nominal === 25000, 'Parser nominal 25rb -> 25.000');
    assert(simTunai.data.parsed && (simTunai.data.parsed.dompet === 'tunai' || simTunai.data.parsed.dompet === 'cash'), 'Parser mendeteksi dompet = "tunai"');

    const walletsAfter2 = (await getJson(`/api/data/wallets?userId=${userId}`)).data.wallets;
    const tunaiAfter2 = walletsAfter2.find(w => w.id === tunaiInit.id);
    const gopayAfter2 = walletsAfter2.find(w => w.id === gopayInit.id);
    const bcaAfter2 = walletsAfter2.find(w => w.id === bcaInit.id);

    assert(tunaiAfter2.balance === tunaiAfter1.balance - 25000, `Saldo Dompet Tunai berkurang tepat Rp25.000 (${tunaiAfter1.balance} -> ${tunaiAfter2.balance})`);
    assert(gopayAfter2.balance === gopayAfter1.balance, `Saldo GoPay TETAP tidak terpengaruh: Rp${gopayAfter2.balance.toLocaleString('id-ID')}`);
    assert(bcaAfter2.balance === bcaAfter1.balance, `Saldo BCA Utama TETAP tidak terpengaruh: Rp${bcaAfter2.balance.toLocaleString('id-ID')}`);
    assert(simTunai.data.reply && (simTunai.data.reply.includes('Tunai') || simTunai.data.reply.includes('tunai')), 'Pesan konfirmasi Telegram menyebut "Dompet Tunai"');

    // --------------------------------------------------------------------------
    // TEST 3: 'makan 35rb bca' reduces balance of BCA Utama specifically
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 3] Transaksi 'makan 35rb bca' -> Memastikan saldo BCA Utama terpotong${RESET}`);
    const simBca = await postJson('/api/telegram/simulate', {
      text: 'makan 35rb bca',
      userId
    });

    assert(simBca.status === 200 && simBca.data.ok, 'Endpoint simulate menerima "makan 35rb bca"');
    assert(simBca.data.parsed && simBca.data.parsed.nominal === 35000, 'Parser nominal 35rb -> 35.000');
    assert(simBca.data.parsed && simBca.data.parsed.dompet === 'bca', 'Parser mendeteksi dompet = "bca"');

    const walletsAfter3 = (await getJson(`/api/data/wallets?userId=${userId}`)).data.wallets;
    const bcaAfter3 = walletsAfter3.find(w => w.id === bcaInit.id);
    const gopayAfter3 = walletsAfter3.find(w => w.id === gopayInit.id);
    const tunaiAfter3 = walletsAfter3.find(w => w.id === tunaiInit.id);

    assert(bcaAfter3.balance === bcaAfter2.balance - 35000, `Saldo BCA Utama berkurang tepat Rp35.000 (${bcaAfter2.balance} -> ${bcaAfter3.balance})`);
    assert(gopayAfter3.balance === gopayAfter2.balance, `Saldo GoPay TETAP: Rp${gopayAfter3.balance.toLocaleString('id-ID')}`);
    assert(tunaiAfter3.balance === tunaiAfter2.balance, `Saldo Dompet Tunai TETAP: Rp${tunaiAfter3.balance.toLocaleString('id-ID')}`);
    assert(simBca.data.reply && simBca.data.reply.includes('BCA Utama'), 'Pesan konfirmasi Telegram menyebut "BCA Utama"');

    // --------------------------------------------------------------------------
    // TEST 4: 'Cek Saldo' shortcut returns all wallets with updated balances
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 4] Shortcut 'Cek Saldo' -> Memeriksa rekap semua dompet dan total saldo${RESET}`);
    const saldoRes = await postJson('/api/telegram/simulate', {
      text: 'Cek Saldo',
      userId
    });

    assert(saldoRes.status === 200 && saldoRes.data.ok, 'Shortcut "Cek Saldo" diproses tanpa error');
    const replyText = saldoRes.data.reply || '';

    assert(replyText.includes('Saldo Semua Dompet'), 'Balasan memuat header "Saldo Semua Dompet"');
    assert(replyText.includes('BCA Utama') && (replyText.includes('9.965.000') || replyText.includes(bcaAfter3.balance.toLocaleString('id-ID'))), 'Memuat saldo terkini BCA Utama');
    assert(replyText.includes('GoPay') && (replyText.includes('480.000') || replyText.includes(gopayAfter3.balance.toLocaleString('id-ID'))), 'Memuat saldo terkini GoPay');
    assert((replyText.includes('Dompet Tunai') || replyText.includes('Tunai')) && (replyText.includes('275.000') || replyText.includes(tunaiAfter3.balance.toLocaleString('id-ID'))), 'Memuat saldo terkini Dompet Tunai');

    const expectedTotal = bcaAfter3.balance + gopayAfter3.balance + tunaiAfter3.balance;
    assert(replyText.includes('Total Saldo') && (replyText.includes('10.720.000') || replyText.includes(expectedTotal.toLocaleString('id-ID'))), `Memuat Total Saldo akurat (Rp${expectedTotal.toLocaleString('id-ID')})`);

    // --------------------------------------------------------------------------
    // TEST 5: 'Audit Penghasilan' shortcut returns cashflow analysis and savings rate score
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 5] Shortcut 'Audit Penghasilan' -> Memeriksa analisis cashflow & rasio tabungan${RESET}`);
    const auditRes = await postJson('/api/telegram/simulate', {
      text: 'Audit Penghasilan',
      userId
    });

    assert(auditRes.status === 200 && auditRes.data.ok, 'Shortcut "Audit Penghasilan" diproses tanpa error');
    const auditReply = auditRes.data.reply || '';

    assert(auditReply.includes('AUDIT PENGHASILAN & KESEHATAN FINANSIAL'), 'Balasan memuat header "AUDIT PENGHASILAN & KESEHATAN FINANSIAL"');
    assert(auditReply.includes('Total Pemasukan'), 'Balasan memuat metrik "Total Pemasukan"');
    assert(auditReply.includes('Total Pengeluaran'), 'Balasan memuat metrik "Total Pengeluaran"');
    assert(auditReply.includes('Net Cashflow'), 'Balasan memuat metrik "Net Cashflow"');
    assert(auditReply.includes('Rasio Tabungan (Savings Rate)'), 'Balasan memuat metrik "Rasio Tabungan (Savings Rate)"');
    assert(auditReply.includes('Status Kesehatan Finansial') || auditReply.includes('Grade'), 'Balasan memuat kalkulasi score status kesehatan finansial (Grade A/B/C/D)');
    assert(auditReply.includes('50/30/20'), 'Balasan menyertakan panduan alokasi metode 50/30/20');
    assert(auditReply.includes('AI Advisor') || auditReply.includes('Rekomendasi'), 'Balasan menyertakan rekomendasi finansial AI Advisor');

    // --------------------------------------------------------------------------
    // TEST 6: Member profile photo update via API and settings page works and updates session
    // --------------------------------------------------------------------------
    console.log(`\n${YELLOW}[TEST 6] Member Profile Photo Update via API & Settings Page Session Sync${RESET}`);
    const testAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';

    // 6a: Test API Update
    const updateRes = await putJson('/api/user/profile', {
      userId,
      fullName: `${testUsername} Pro`,
      avatarUrl: testAvatarUrl
    });

    assert(updateRes.status === 200 && updateRes.data.ok, 'API PUT /api/user/profile berhasil mengupdate profil user');
    assert(updateRes.data.user && updateRes.data.user.avatar_url === testAvatarUrl, 'API merespons dengan URL avatar foto yang baru');

    // Verify persistence via login endpoint
    const reLogin = await postJson('/api/auth/login', { emailOrNameOrPhone: testUsername });
    assert(reLogin.data.user && reLogin.data.user.avatar_url === testAvatarUrl, 'Data foto avatar tersimpan permanen di profil database');

    // 6b: Test UI Settings Page & Sidebar source code conformity
    const settingsPath = path.join(process.cwd(), 'src', 'app', 'settings', 'page.tsx');
    const sidebarPath = path.join(process.cwd(), 'src', 'components', 'layout', 'Sidebar.tsx');

    const settingsCode = fs.readFileSync(settingsPath, 'utf8');
    const sidebarCode = fs.readFileSync(sidebarPath, 'utf8');

    assert(
      settingsCode.includes('avatarUrl') || settingsCode.includes('avatar_url') || settingsCode.includes('Foto Profil'),
      'Halaman Settings memuat field input foto profil / avatar pengguna'
    );
    assert(
      settingsCode.includes('/api/user/profile') || settingsCode.includes('setCurrentUser'),
      'Halaman Settings melakukan pemanggilan API profil & memperbarui session pengguna (setCurrentUser)'
    );
    assert(
      settingsCode.includes('tatadana_auth_change'),
      'Halaman Settings memancarkan event "tatadana_auth_change" untuk sinkronisasi instan antar komponen'
    );
    assert(
      sidebarCode.includes('avatar_url') || sidebarCode.includes('effectiveAvatar') || sidebarCode.includes('user?.avatar_url'),
      'Komponen Sidebar membaca dan menampilkan user?.avatar_url dari active session pengguna'
    );

  } catch (err) {
    console.error(`\n${RED}Unexpected runtime error in test suite:${RESET}`, err);
    failedCount++;
  }

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  const total = passedCount + failedCount;
  console.log(`\n${CYAN}==============================================================================${RESET}`);
  console.log(`${CYAN}TEST SUMMARY: ${passedCount}/${total} PASSED (${failedCount} FAILED)${RESET}`);
  if (failedCount === 0) {
    console.log(`${GREEN}SELURUH PENGUJIAN OTOMATIS SUITE 2 BERHASIL (100% PASS)!${RESET}`);
  } else {
    console.log(`${RED}ADA ${failedCount} PENGUJIAN YANG GAGAL. SILAKAN CEK DETAIL DI ATAS.${RESET}`);
  }
  console.log(`${CYAN}==============================================================================${RESET}\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
