export type PlanType = 'starter' | 'pro';
export type BillingType = 'monthly' | 'lifetime';
export type WalletType = 'cash' | 'bank' | 'ewallet';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionSource = 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice';
export type AIProviderName = 'gemini' | 'openai' | 'deepseek';
export type AIMode = 'single' | 'failover';
export type BotConnectionStatus = 'connected' | 'disconnected' | 'testing';

export interface Profile {
  id: string;
  email?: string;
  full_name: string;
  phone_number: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  active_plan: PlanType;
  billing_type: BillingType;
  default_currency: string;
  reminder_enabled: boolean;
  reminder_frequency: 1 | 2;
  reminder_time_1: string;
  reminder_time_2: string;
  is_superadmin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: WalletType;
  balance: number;
  is_default: boolean;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  is_default: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  monthly_limit: number;
  spent_amount?: number;
  month_year: string; // YYYY-MM
  alert_80_sent: boolean;
  alert_100_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id?: string;
  transaction_id?: string;
  item_name: string;
  price: number;
  category_id?: string | null;
  category_name?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  wallet_name?: string;
  category_id: string | null;
  category_name?: string;
  category_icon?: string;
  type: TransactionType;
  amount: number;
  notes: string | null;
  transaction_date: string; // ISO in WIB
  source: TransactionSource;
  transfer_to_wallet_id?: string | null;
  transfer_to_wallet_name?: string | null;
  receipt_image_url?: string | null;
  merchant_name?: string | null;
  receipt_items?: ReceiptItem[];
  created_at: string;
  updated_at: string;
}

export interface TelegramLink {
  id: string;
  user_id: string;
  telegram_user_id: number | null;
  telegram_chat_id: number | null;
  bot_token_encrypted: string | null;
  bot_token_raw?: string | null;
  bot_username: string | null;
  status_koneksi: BotConnectionStatus;
  connection_mode?: 'polling' | 'webhook';
  webhook_url: string | null;
  linked_at: string;
}

export interface AIProviderConfig {
  id: string;
  name: AIProviderName;
  display_name: string;
  api_key_encrypted: string;
  is_active: boolean;
  priority: number;
  mode: AIMode;
  model_name: string;
}

export interface AILog {
  id: string;
  provider: string;
  feature: 'text_parse' | 'photo_ocr' | 'voice_transcribe' | 'financial_advisor' | 'category_recommendation';
  prompt_preview: string;
  tokens_used: number;
  cost_estimated: number;
  latency_ms: number;
  status: 'success' | 'error';
  error_message?: string | null;
  created_at: string;
}

export interface ReportExport {
  id: string;
  user_id: string;
  file_name: string;
  file_type: 'pdf' | 'xlsx';
  file_path: string;
  signed_url: string;
  signed_url_expires_at: string;
  period_range: string;
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  plan: PlanType;
  billing_type: BillingType;
  amount: number;
  status: 'active' | 'pending' | 'expired' | 'rejected';
  payment_method: 'midtrans' | 'manual_transfer';
  midtrans_order_id?: string | null;
  proof_image_url?: string | null;
  admin_notes?: string | null;
  created_at: string;
}

export interface ParsedTransactionResult {
  jenis: 'pemasukan' | 'pengeluaran' | 'transfer';
  nominal: number;
  kategori: string;
  catatan: string;
  dompet?: string;
  merchant?: string;
  items?: ReceiptItem[];
  rawTranscript?: string;
  date?: string;
}

export interface PendingRegistration {
  id: string;
  full_name: string;
  email?: string;
  phone_number: string;
  password?: string;
  status: 'pending' | 'approved' | 'rejected';
  whatsapp_url: string;
  created_at: string;
  approved_at?: string;
  admin_notes?: string;
}
