import { createClient } from '@supabase/supabase-js';
import { 
  Profile, Wallet, Category, Budget, Transaction, 
  ReceiptItem, TelegramLink, AIProviderConfig, AILog, 
  ReportExport, Subscription, PendingRegistration 
} from '@/types';
import { getWIBDate, getCurrentMonthKeyWIB } from '@/lib/utils/timezone';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-tatadana.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key-local-development';

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// In-memory fallback mock state (persists across runtime while server is running)
class InMemoryDataStore {
  profiles: Map<string, Profile> = new Map();
  phoneOtps: Map<string, { code: string; expires: number; verified: boolean }> = new Map();
  wallets: Map<string, Wallet> = new Map();
  categories: Map<string, Category> = new Map();
  budgets: Map<string, Budget> = new Map();
  transactions: Map<string, Transaction> = new Map();
  receiptItems: Map<string, ReceiptItem[]> = new Map();
  telegramLinks: Map<string, TelegramLink> = new Map(); // keyed by user_id
  telegramIdempotency: Set<number> = new Set();
  aiProviders: Map<string, AIProviderConfig> = new Map();
  aiLogs: AILog[] = [];
  reportExports: ReportExport[] = [];
  subscriptions: Subscription[] = [];
  auditLogs: any[] = [];
  activeTelegramUserId: string = 'user-demo-tatadana';
  pendingRegistrations: Map<string, PendingRegistration> = new Map();

  setActiveTelegramUser(userId: string) {
    this.activeTelegramUserId = userId;
  }

  getActiveTelegramUser(): string {
    return this.activeTelegramUserId || 'user-demo-tatadana';
  }

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    // Seed default categories
    const defaultCats: Array<Omit<Category, 'id' | 'created_at'>> = [
      { user_id: null, name: 'Makanan & Minuman', icon: '🍜', color: '#F97316', type: 'expense', is_default: true },
      { user_id: null, name: 'Transportasi', icon: '🚗', color: '#3B82F6', type: 'expense', is_default: true },
      { user_id: null, name: 'Hiburan & Hobi', icon: '🎮', color: '#8B5CF6', type: 'expense', is_default: true },
      { user_id: null, name: 'Tagihan & Utilitas', icon: '🏠', color: '#EF4444', type: 'expense', is_default: true },
      { user_id: null, name: 'Kesehatan & Medis', icon: '💊', color: '#10B981', type: 'expense', is_default: true },
      { user_id: null, name: 'Belanja Kebutuhan', icon: '👕', color: '#EC4899', type: 'expense', is_default: true },
      { user_id: null, name: 'Pendidikan & Kursus', icon: '📚', color: '#06B6D4', type: 'expense', is_default: true },
      { user_id: null, name: 'Gaji Bulanan', icon: '💰', color: '#22C55E', type: 'income', is_default: true },
      { user_id: null, name: 'Freelance & Side Job', icon: '💼', color: '#F59E0B', type: 'income', is_default: true },
      { user_id: null, name: 'Investasi & Dividen', icon: '📈', color: '#14B8A6', type: 'income', is_default: true },
    ];

    defaultCats.forEach((c, idx) => {
      const id = `cat-default-${idx + 1}`;
      this.categories.set(id, { ...c, id, created_at: new Date().toISOString() });
    });

    // Seed default Member and Superadmin users
    const memberUserId = 'user-member-tatadana';
    this.profiles.set(memberUserId, {
      id: memberUserId,
      email: 'member@tatadana.id',
      full_name: 'Ahmad Pratama (Member Pro)',
      phone_number: '081234567890',
      phone_verified: true,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      active_plan: 'pro',
      billing_type: 'lifetime',
      default_currency: 'IDR',
      reminder_enabled: true,
      reminder_frequency: 1,
      reminder_time_1: '08:00',
      reminder_time_2: '20:00',
      is_superadmin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const adminUserId = 'user-admin-tatadana';
    this.profiles.set(adminUserId, {
      id: adminUserId,
      email: 'admin@tatadana.id',
      full_name: 'Superadmin TataDana',
      phone_number: '081299999999',
      phone_verified: true,
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      active_plan: 'pro',
      billing_type: 'lifetime',
      default_currency: 'IDR',
      reminder_enabled: true,
      reminder_frequency: 2,
      reminder_time_1: '07:00',
      reminder_time_2: '19:00',
      is_superadmin: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Also keep user-demo-tatadana pointing to member profile for backward-compatibility
    const demoUserId = 'user-demo-tatadana';
    this.profiles.set(demoUserId, {
      id: demoUserId,
      email: 'demo@tatadana.id',
      full_name: 'Budi Santoso (Member Pro)',
      phone_number: '081288887777',
      phone_verified: true,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      active_plan: 'pro',
      billing_type: 'monthly',
      default_currency: 'IDR',
      reminder_enabled: true,
      reminder_frequency: 1,
      reminder_time_1: '08:00',
      reminder_time_2: '20:00',
      is_superadmin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed default wallets for demo user
    const w1: Wallet = {
      id: 'wallet-bca',
      user_id: demoUserId,
      name: 'BCA Utama',
      type: 'bank',
      balance: 14750000,
      is_default: true,
      color: '#00529C',
      icon: 'landmark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const w2: Wallet = {
      id: 'wallet-gopay',
      user_id: demoUserId,
      name: 'GoPay',
      type: 'ewallet',
      balance: 450000,
      is_default: false,
      color: '#00AED6',
      icon: 'smartphone',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const w3: Wallet = {
      id: 'wallet-cash',
      user_id: demoUserId,
      name: 'Cash Dompet',
      type: 'cash',
      balance: 320000,
      is_default: false,
      color: '#10B981',
      icon: 'banknote',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.wallets.set(w1.id, w1);
    this.wallets.set(w2.id, w2);
    this.wallets.set(w3.id, w3);

    // Seed default wallets for official member
    const wm1: Wallet = {
      id: 'wallet-member-bca',
      user_id: memberUserId,
      name: 'BCA Utama',
      type: 'bank',
      balance: 14750000,
      is_default: true,
      color: '#00529C',
      icon: 'landmark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const wm2: Wallet = {
      id: 'wallet-member-gopay',
      user_id: memberUserId,
      name: 'GoPay',
      type: 'ewallet',
      balance: 450000,
      is_default: false,
      color: '#00AED6',
      icon: 'smartphone',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const wm3: Wallet = {
      id: 'wallet-member-cash',
      user_id: memberUserId,
      name: 'Cash Dompet',
      type: 'cash',
      balance: 320000,
      is_default: false,
      color: '#10B981',
      icon: 'banknote',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.wallets.set(wm1.id, wm1);
    this.wallets.set(wm2.id, wm2);
    this.wallets.set(wm3.id, wm3);

    // Seed default budgets for demo user
    const curMonth = getCurrentMonthKeyWIB();
    const b1: Budget = {
      id: 'budget-1',
      user_id: demoUserId,
      category_id: 'cat-default-1', // Makanan
      category_name: 'Makanan & Minuman',
      category_icon: '🍜',
      category_color: '#F97316',
      monthly_limit: 3000000,
      spent_amount: 1420000,
      month_year: curMonth,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const b2: Budget = {
      id: 'budget-2',
      user_id: demoUserId,
      category_id: 'cat-default-2', // Transport
      category_name: 'Transportasi',
      category_icon: '🚗',
      category_color: '#3B82F6',
      monthly_limit: 1200000,
      spent_amount: 850000,
      month_year: curMonth,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const b3: Budget = {
      id: 'budget-3',
      user_id: demoUserId,
      category_id: 'cat-default-3', // Hiburan
      category_name: 'Hiburan & Hobi',
      category_icon: '🎮',
      category_color: '#8B5CF6',
      monthly_limit: 800000,
      spent_amount: 680000,
      month_year: curMonth,
      alert_80_sent: true,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.budgets.set(b1.id, b1);
    this.budgets.set(b2.id, b2);
    this.budgets.set(b3.id, b3);

    // Seed recent transactions
    const txData: Array<Omit<Transaction, 'id' | 'created_at' | 'updated_at'>> = [
      {
        user_id: demoUserId,
        wallet_id: 'wallet-bca',
        wallet_name: 'BCA Utama',
        category_id: 'cat-default-8',
        category_name: 'Gaji Bulanan',
        category_icon: '💰',
        type: 'income',
        amount: 12500000,
        notes: 'Gaji PT Tech Nusantara Bulan Ini',
        transaction_date: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'web',
      },
      {
        user_id: demoUserId,
        wallet_id: 'wallet-gopay',
        wallet_name: 'GoPay',
        category_id: 'cat-default-1',
        category_name: 'Makanan & Minuman',
        category_icon: '🍜',
        type: 'expense',
        amount: 45000,
        notes: 'Makan siang Nasi Padang',
        transaction_date: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'telegram_text',
      },
      {
        user_id: demoUserId,
        wallet_id: 'wallet-cash',
        wallet_name: 'Cash Dompet',
        category_id: 'cat-default-2',
        category_name: 'Transportasi',
        category_icon: '🚗',
        type: 'expense',
        amount: 25000,
        notes: 'Bensin motor pertalite',
        transaction_date: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'telegram_text',
      },
      {
        user_id: demoUserId,
        wallet_id: 'wallet-bca',
        wallet_name: 'BCA Utama',
        category_id: 'cat-default-6',
        category_name: 'Belanja Kebutuhan',
        category_icon: '👕',
        type: 'expense',
        amount: 285000,
        notes: 'Belanja bulanan Superindo',
        transaction_date: new Date().toISOString(),
        source: 'telegram_photo',
        merchant_name: 'Superindo Dago',
        receipt_items: [
          { item_name: 'Minyak Goreng 2L', price: 34000 },
          { item_name: 'Beras Premium 5kg', price: 78000 },
          { item_name: 'Daging Ayam Fillet', price: 55000 },
          { item_name: 'Buah Apel Fuji', price: 42000 },
          { item_name: 'Sabun Mandi & Detergen', price: 76000 },
        ]
      }
    ];

    txData.forEach((t, i) => {
      const id = `tx-demo-${i + 1}`;
      this.transactions.set(id, { ...t, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    });

    // Seed Telegram link for demo user
    this.telegramLinks.set(demoUserId, {
      id: 'tg-link-demo',
      user_id: demoUserId,
      telegram_user_id: 123456789,
      telegram_chat_id: 123456789,
      bot_token_encrypted: 'mock_encrypted_bot_token',
      bot_username: 'TataDanaBot',
      status_koneksi: 'connected',
      webhook_url: 'https://tatadana-dev.ngrok.app/api/telegram/webhook',
      linked_at: new Date().toISOString(),
    });

    // Seed AI Providers
    this.aiProviders.set('gemini', {
      id: 'prov-gemini',
      name: 'gemini',
      display_name: 'Google Gemini 1.5 Flash',
      api_key_encrypted: 'mock_gemini_encrypted',
      is_active: true,
      priority: 1,
      mode: 'failover',
      model_name: 'gemini-1.5-flash',
    });
    this.aiProviders.set('openai', {
      id: 'prov-openai',
      name: 'openai',
      display_name: 'OpenAI GPT-4o Mini',
      api_key_encrypted: 'mock_openai_encrypted',
      is_active: true,
      priority: 2,
      mode: 'failover',
      model_name: 'gpt-4o-mini',
    });
    this.aiProviders.set('deepseek', {
      id: 'prov-deepseek',
      name: 'deepseek',
      display_name: 'DeepSeek Chat V3',
      api_key_encrypted: 'mock_deepseek_encrypted',
      is_active: true,
      priority: 3,
      mode: 'failover',
      model_name: 'deepseek-chat',
    });

    // Seed sample pending registration for Admin Approval preview
    this.pendingRegistrations.set('reg-sample-1', {
      id: 'reg-sample-1',
      full_name: 'Wildan Maulana (Pendaftar Baru)',
      phone_number: '089531331333',
      email: 'wildan.new@tatadana.id',
      status: 'pending',
      whatsapp_url: 'https://wa.me/6289531331333?text=Halo%20Admin%20TataDana%2C%20saya%20ingin%20konfirmasi%20pendaftaran%20akun%20baru',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    });
  }
}

export const inMemoryStore = new InMemoryDataStore();
