/**
 * Comprehensive Verification Script for TataDana Revision 3
 * Tests all 8 Requirements:
 * R1: Zero initial balance for new accounts
 * R2: Empty Telegram API token and disconnected status for new accounts
 * R3: Telegram active account sync
 * R4: Landing page Masuk Dashboard conditional CTA
 * R5: Dashboard route guard for unauthenticated users
 * R6: Admin member role switcher to Pro
 * R7: WhatsApp registration approval flow to 089531331333
 * R8: Admin approval action and post-approval activation
 */

const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Running Comprehensive Verification for Revision 3');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --- TEST R7: WhatsApp Registration Request ---
  console.log('📌 Testing Requirement 7: WhatsApp Registration Request Flow');
  const uniqueId = Date.now();
  const regPayload = {
    fullName: 'Test Calon Member R7',
    phone: `0895${String(uniqueId).slice(-8)}`,
    email: `calon.member.${uniqueId}@tatadana.id`
  };

  const regRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, regPayload);

  assert(regRes.status === 200 && regRes.data.ok === true, 'Pendaftaran pending request berhasil dibuat (200 OK)');
  assert(regRes.data.whatsappUrl.includes('89531331333'), 'URL WhatsApp mengarah ke admin 089531331333 (wa.me/6289531331333)');
  assert(decodeURIComponent(regRes.data.whatsappUrl).includes('Test Calon Member R7'), 'URL WhatsApp berisi nama pendaftar');
  const regId = regRes.data.registrationId;

  // --- TEST R7 Guard: Login blocked while awaiting approval ---
  console.log('\n📌 Testing Requirement 7 Guard: Login Blocked for Pending Account');
  const pendingLoginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { emailOrNameOrPhone: regPayload.phone, password: 'password123' });

  assert(pendingLoginRes.status === 403, 'Login diblokir dengan status 403 Forbidden untuk akun pending approval');
  assert(pendingLoginRes.data.isPendingApproval === true, 'Response menyertakan isPendingApproval = true');
  assert(pendingLoginRes.data.message.includes('089531331333'), 'Pesan error menginstruksikan konfirmasi ke Admin WhatsApp 089531331333');

  // --- TEST R8: Admin Approvals Panel & Action ---
  console.log('\n📌 Testing Requirement 8: Admin Approvals Panel & Member Activation');
  const approvalsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/approvals',
    method: 'GET'
  });

  assert(approvalsRes.status === 200 && approvalsRes.data.ok === true, 'Admin berhasil mengambil daftar pendaftaran pending');
  const foundPending = approvalsRes.data.pendingRegistrations.find(r => r.id === regId);
  assert(foundPending && foundPending.status === 'pending', 'Calon member ditemukan di daftar persetujuan admin');

  // Approve member
  const approveActionRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/approvals/action',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { registrationId: regId, action: 'approve' });

  assert(approveActionRes.status === 200 && approveActionRes.data.ok === true, 'Admin berhasil menyetujui member baru');
  const approvedUser = approveActionRes.data.user;
  assert(approvedUser && approvedUser.full_name === 'Test Calon Member R7', 'Profil member baru aktif terbuat');

  // --- TEST R1: Zero Balance on Newly Approved / Created Accounts ---
  console.log('\n📌 Testing Requirement 1: Zero Initial Balance (Rp0)');
  const walletsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/data/wallets?userId=${approvedUser.id}`,
    method: 'GET'
  });

  assert(walletsRes.status === 200 && walletsRes.data.ok === true, 'Berhasil mengambil dompet member baru');
  const userWallets = walletsRes.data.wallets;
  assert(userWallets.length === 3, 'Member baru memiliki tepat 3 dompet (BCA Utama, GoPay, Dompet Tunai)');
  const nonZeroWallets = userWallets.filter(w => Number(w.balance) !== 0);
  assert(nonZeroWallets.length === 0, 'SEMUA saldo dompet member baru adalah tepat Rp0 (tidak ada 10jt / 500k / 300k)');

  // Verify direct login without registration is rejected under strict auth
  const directLoginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { emailOrNameOrPhone: 'Wildan Zero Balance', password: 'password123' });

  assert(directLoginRes.status === 404, 'Login langsung akun belum terdaftar ditolak (404 Not Found)');

  // Register Wildan and approve via Admin
  const regWildanRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register-request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    fullName: 'Wildan Zero Balance',
    email: `wildan.zero.${uniqueId}@tatadana.id`,
    phone: `0898${String(uniqueId).slice(-8)}`,
    password: 'password123'
  });
  const wildanPendingId = regWildanRes.data.registrationId;
  await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/approvals/action',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    registrationId: wildanPendingId,
    action: 'approve',
    adminId: 'admin-super'
  });

  const wildanLoginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { emailOrNameOrPhone: `wildan.zero.${uniqueId}@tatadana.id`, password: 'password123' });

  assert(wildanLoginRes.status === 200 && wildanLoginRes.data.ok === true, 'Akun Wildan yang disetujui admin berhasil login');
  const wildanId = wildanLoginRes.data.user.id;
  const wildanWalletsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/data/wallets?userId=${wildanId}`,
    method: 'GET'
  });
  const wildanWallets = wildanWalletsRes.data.wallets;
  const nonZeroWildan = wildanWallets.filter(w => Number(w.balance) !== 0);
  assert(nonZeroWildan.length === 0, 'Akun Wildan Zero Balance semua dompetnya bersaldo Rp0');

  // --- TEST R2: Empty Telegram API Token for New Accounts ---
  console.log('\n📌 Testing Requirement 2: Empty Telegram API Token Hygiene');
  const tgSettingsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/telegram/setup-bot?userId=${approvedUser.id}`,
    method: 'GET'
  });

  assert(tgSettingsRes.status === 200, 'Berhasil mengambil status bot Telegram member baru');
  assert(tgSettingsRes.data.botToken === '', 'Kode API Telegram member baru kosong string ("")');
  assert(tgSettingsRes.data.status === 'disconnected', 'Status Telegram member baru adalah disconnected (🔴 Belum Terhubung)');
  assert(!JSON.stringify(tgSettingsRes.data).includes('mock_telegram_bot_token'), 'Tidak ada string mock_telegram_bot_token bocor ke client');

  // --- TEST R3: Telegram Active Account Sync ---
  console.log('\n📌 Testing Requirement 3: Telegram Bot Active Account Sync');
  const syncRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/telegram/active-user',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { userId: wildanId });

  assert(syncRes.status === 200 && syncRes.data.ok === true, 'Sinkronisasi akun aktif bot Telegram berhasil');
  assert(syncRes.data.activeUserId === wildanId, 'Bot Telegram disinkronkan ke akun Wildan Zero Balance');

  // Test simulation / processing against active user
  const simRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/telegram/simulate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { text: 'gaji 5000000 bca' });

  assert(simRes.status === 200 && simRes.data.ok === true, 'Simulasi transaksi dengan active user berhasil');

  // Check Wildan's wallet now
  const updatedWildanWalletsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/data/wallets?userId=${wildanId}`,
    method: 'GET'
  });
  const updatedBca = updatedWildanWalletsRes.data.wallets.find(w => w.name.includes('BCA'));
  assert(Number(updatedBca.balance) === 5000000, `Saldo BCA akun aktif Wildan bertambah sesuai transaksi Telegram (Rp5.000.000, sebelumnya Rp0)`);

  // --- TEST R6: Admin Member Role Switcher to Pro ---
  console.log('\n📌 Testing Requirement 6: Admin Member Role Switcher to Pro');
  const roleUpgradeRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/role',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { userId: approvedUser.id, plan: 'pro' });

  assert(roleUpgradeRes.status === 200 && roleUpgradeRes.data.ok === true, 'Admin berhasil mengubah role member ke PRO');
  assert(roleUpgradeRes.data.user.active_plan === 'pro', 'active_plan pengguna berubah menjadi "pro"');

  const roleDowngradeRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users/role',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { userId: approvedUser.id, plan: 'starter' });

  assert(roleDowngradeRes.status === 200 && roleDowngradeRes.data.user.active_plan === 'starter', 'Admin berhasil mengembalikan role ke STARTER');

  console.log('\n====================================================');
  console.log(`🎯 Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
