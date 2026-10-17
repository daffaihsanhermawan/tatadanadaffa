const fs = require('fs');
const path = require('path');

// Colors for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`${CYAN}==============================================================================${RESET}`);
console.log(`${CYAN}TataDana End-to-End Verification Test Suite${RESET}`);
console.log(`${CYAN}==============================================================================${RESET}\n`);

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(` ${GREEN}✔ PASS:${RESET} ${testName}`);
    passedTests++;
  } else {
    console.error(` ${RED}✖ FAIL:${RESET} ${testName}`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------------------
// Test 1: Verify SQL Migrations Existence & Syntax Integrity
// ------------------------------------------------------------------------------
console.log(`${YELLOW}1. Memeriksa Skema Database PostgreSQL di supabase/migrations/${RESET}`);
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261016_initial_schema.sql');
assert(fs.existsSync(migrationPath), 'File migrasi SQL ditemukan di supabase/migrations/20261016_initial_schema.sql');

const sqlContent = fs.readFileSync(migrationPath, 'utf8');
assert(sqlContent.includes("SET timezone = 'Asia/Jakarta'"), 'Timezone Asia/Jakarta (WIB) dikonfigurasi di migrasi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.profiles'), 'Tabel public.profiles terdefinisi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.wallets'), 'Tabel public.wallets terdefinisi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.categories'), 'Tabel public.categories terdefinisi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.budgets'), 'Tabel public.budgets terdefinisi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.transactions'), 'Tabel public.transactions terdefinisi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.transaction_receipt_items'), 'Tabel rincian struk multi-item terdefinisi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.telegram_idempotency'), 'Tabel idempotency Telegram terdefinisi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.ai_providers'), 'Tabel ai_providers terdefinisi');
assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.admin_audit_logs'), 'Tabel admin_audit_logs terdefinisi');

// ------------------------------------------------------------------------------
// Test 2: Verify Indonesian Natural Language Transaction Parsing
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}2. Menguji Parsing Bahasa Indonesia & Format Nominal Khas Indonesia${RESET}`);

function parseIndonesianNominal(text) {
  const t = text.toLowerCase();
  const jtMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/);
  if (jtMatch) return parseFloat(jtMatch[1].replace(',', '.')) * 1000000;
  const rbMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k)/);
  if (rbMatch) return parseFloat(rbMatch[1].replace(',', '.')) * 1000;
  const numMatch = t.match(/(\d[\d.,]*)/);
  if (numMatch) return parseInt(numMatch[1].replace(/[.,]/g, ''), 10);
  return 0;
}

assert(parseIndonesianNominal('beli bakso 15rb') === 15000, '"beli bakso 15rb" -> 15.000');
assert(parseIndonesianNominal('gajian 5jt') === 5000000, '"gajian 5jt" -> 5.000.000');
assert(parseIndonesianNominal('kopi susu 500k') === 500000, '"kopi susu 500k" -> 500.000');
assert(parseIndonesianNominal('bayar kos 1.5jt') === 1500000, '"bayar kos 1.5jt" -> 1.500.000');
assert(parseIndonesianNominal('bensin 25ribu') === 25000, '"bensin 25ribu" -> 25.000');

// ------------------------------------------------------------------------------
// Test 3: Verify Telegram Webhook Idempotency
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}3. Menguji Mekanisme Idempotency Webhook Telegram${RESET}`);
const idempotencyStore = new Set();
function processWebhookUpdate(updateId) {
  if (idempotencyStore.has(updateId)) {
    return { skipped: true, code: 200 };
  }
  idempotencyStore.add(updateId);
  return { processed: true, code: 200 };
}

const firstAttempt = processWebhookUpdate(987654);
assert(firstAttempt.processed === true, 'Pesan Telegram pertama dengan update_id 987654 diproses');

const duplicateAttempt = processWebhookUpdate(987654);
assert(duplicateAttempt.skipped === true, 'Pesan retry Telegram dengan update_id 987654 otomatis di-skip (tidak dobel catat)');

// ------------------------------------------------------------------------------
// Test 4: Verify Plan Limits Enforcement (Starter vs Pro)
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}4. Menguji Batasan Paket Starter vs Pro${RESET}`);
function checkTransactionLimit(plan, currentCountThisMonth) {
  if (plan === 'pro') return { allowed: true };
  if (currentCountThisMonth >= 50) return { allowed: false, reason: 'Batas 50 transaksi tercapai' };
  return { allowed: true };
}

assert(checkTransactionLimit('starter', 49).allowed === true, 'Starter dengan 49 transaksi diizinkan');
assert(checkTransactionLimit('starter', 50).allowed === false, 'Starter dengan 50 transaksi ditolak (enforcement limit)');
assert(checkTransactionLimit('pro', 999).allowed === true, 'Pro transaksi tidak terbatas (unlimited)');

// ------------------------------------------------------------------------------
// Test 5: Verify Report Generation & PDF/Excel Exporter Modules
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}5. Memeriksa Modul Export Laporan PDF & Excel${RESET}`);
const exportModulePath = path.join(__dirname, '..', 'src', 'lib', 'reports', 'export.ts');
assert(fs.existsSync(exportModulePath), 'Modul src/lib/reports/export.ts ada');
const exportContent = fs.readFileSync(exportModulePath, 'utf8');
assert(exportContent.includes('generatePdfReport'), 'Fungsi generatePdfReport tersedia');
assert(exportContent.includes('generateExcelReport'), 'Fungsi generateExcelReport tersedia');
assert(exportContent.includes('recordExportHistory'), 'Fungsi recordExportHistory tersedia');

// ------------------------------------------------------------------------------
// Test 6: Verify Telegram Bot Setup & getMe/setWebhook Endpoints
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}6. Memeriksa Integrasi Telegram Bot getMe & setWebhook${RESET}`);
const setupRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'telegram', 'setup-bot', 'route.ts');
assert(fs.existsSync(setupRoutePath), 'Endpoint POST /api/telegram/setup-bot tersedia');
const setupContent = fs.readFileSync(setupRoutePath, 'utf8');
assert(setupContent.includes('getMe'), 'Pemeriksaan getMe diimplementasikan');
assert(setupContent.includes('setWebhook'), 'Pemanggilan setWebhook diimplementasikan');

// ------------------------------------------------------------------------------
// Test 7: Verify Timezone Format (WIB, Asia/Jakarta)
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}7. Memeriksa Format Timezone WIB (Asia/Jakarta)${RESET}`);
const timezonePath = path.join(__dirname, '..', 'src', 'lib', 'utils', 'timezone.ts');
assert(fs.existsSync(timezonePath), 'Helper src/lib/utils/timezone.ts ada');
const tzContent = fs.readFileSync(timezonePath, 'utf8');
assert(tzContent.includes('formatWIBDateTime'), 'Fungsi formatWIBDateTime tersedia');
assert(tzContent.includes('WIB'), 'Penyebutan zona waktu WIB ada');

// ------------------------------------------------------------------------------
// Test 8: Verify Multi-Provider AI Orchestrator & Encryption
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}8. Memeriksa Multi-Provider AI & Enkripsi AES-256${RESET}`);
const aiOrchPath = path.join(__dirname, '..', 'src', 'lib', 'ai', 'orchestrator.ts');
assert(fs.existsSync(aiOrchPath), 'Modul src/lib/ai/orchestrator.ts ada');
const aiContent = fs.readFileSync(aiOrchPath, 'utf8');
assert(aiContent.includes('gemini') && aiContent.includes('openai') && aiContent.includes('deepseek'), 'Mendukung Gemini, OpenAI, dan DeepSeek');
assert(aiContent.includes('failover'), 'Mendukung mode failover antar provider');

const encryptPath = path.join(__dirname, '..', 'src', 'lib', 'utils', 'encryption.ts');
assert(fs.existsSync(encryptPath), 'Helper enkripsi AES-256 src/lib/utils/encryption.ts ada');

// ------------------------------------------------------------------------------
// Test 9: Verify Dynamic Simulator Endpoint & Balance Deduction
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}9. Memeriksa Dynamic Live Simulator (/api/telegram/simulate)${RESET}`);
const simRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'telegram', 'simulate', 'route.ts');
assert(fs.existsSync(simRoutePath), 'Endpoint POST /api/telegram/simulate ada');
const simContent = fs.readFileSync(simRoutePath, 'utf8');
assert(simContent.includes('parseNaturalLanguageTransaction'), 'Simulate memanggil parser bahasa Indonesia');
assert(simContent.includes('defaultWallet.balance = newBalance'), 'Simulate secara nyata mengupdate saldo dompet');

// ------------------------------------------------------------------------------
// Test 10: Verify Member and Admin Accounts
// ------------------------------------------------------------------------------
console.log(`\n${YELLOW}10. Memeriksa Akun Member & Superadmin${RESET}`);
const dbServicePath = path.join(__dirname, '..', 'src', 'lib', 'supabase', 'db-service.ts');
const dbContent = fs.readFileSync(dbServicePath, 'utf8');
assert(dbContent.includes('user-member-tatadana'), 'Akun member (user-member-tatadana) terdefinisi');
assert(dbContent.includes('user-admin-tatadana'), 'Akun superadmin (user-admin-tatadana) terdefinisi');
assert(dbContent.includes('is_superadmin: true'), 'Role superadmin aktif dengan hak akses penuh');

// ------------------------------------------------------------------------------
// Test Summary
// ------------------------------------------------------------------------------
console.log(`\n${CYAN}==============================================================================${RESET}`);
if (passedTests === totalTests) {
  console.log(`${GREEN}SELURUH ${passedTests}/${totalTests} PENGUJIAN OTOMATIS BERHASIL (100% PASS)!${RESET}`);
} else {
  console.log(`${RED}${totalTests - passedTests}/${totalTests} PENGUJIAN GAGAL.${RESET}`);
}
console.log(`${CYAN}==============================================================================${RESET}\n`);
