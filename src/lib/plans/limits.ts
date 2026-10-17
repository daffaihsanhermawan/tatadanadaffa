import { Profile } from '@/types';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { getCurrentMonthKeyWIB } from '@/lib/utils/timezone';

export interface PlanLimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  maxAllowed?: number;
}

/**
 * Check if user can create a new transaction this month
 */
export async function checkTransactionLimit(userId: string): Promise<PlanLimitCheckResult> {
  const profile = inMemoryStore.profiles.get(userId);
  if (!profile) return { allowed: false, reason: 'Pengguna tidak ditemukan.' };

  if (profile.active_plan === 'pro') {
    return { allowed: true };
  }

  // Starter limit: 50 transactions / month
  const curMonth = getCurrentMonthKeyWIB();
  const userTxThisMonth = Array.from(inMemoryStore.transactions.values())
    .filter(t => t.user_id === userId && t.transaction_date.startsWith(curMonth));

  if (userTxThisMonth.length >= 50) {
    return {
      allowed: false,
      reason: 'Batas 50 transaksi bulanan untuk paket Starter telah tercapai.',
      currentCount: userTxThisMonth.length,
      maxAllowed: 50
    };
  }

  return {
    allowed: true,
    currentCount: userTxThisMonth.length,
    maxAllowed: 50
  };
}

/**
 * Check if user can create another wallet
 */
export function checkWalletLimit(userId: string): PlanLimitCheckResult {
  const profile = inMemoryStore.profiles.get(userId);
  if (!profile) return { allowed: false, reason: 'Pengguna tidak ditemukan.' };

  if (profile.active_plan === 'pro') return { allowed: true };

  const userWallets = Array.from(inMemoryStore.wallets.values()).filter(w => w.user_id === userId);
  if (userWallets.length >= 3) {
    return {
      allowed: false,
      reason: 'Paket Starter dibatasi maksimal 3 dompet. Upgrade ke Pro untuk dompet unlimited.',
      currentCount: userWallets.length,
      maxAllowed: 3
    };
  }

  return { allowed: true, currentCount: userWallets.length, maxAllowed: 3 };
}

/**
 * Check if user can create another budget category
 */
export function checkBudgetLimit(userId: string): PlanLimitCheckResult {
  const profile = inMemoryStore.profiles.get(userId);
  if (!profile) return { allowed: false, reason: 'Pengguna tidak ditemukan.' };

  if (profile.active_plan === 'pro') return { allowed: true };

  const userBudgets = Array.from(inMemoryStore.budgets.values()).filter(b => b.user_id === userId);
  if (userBudgets.length >= 5) {
    return {
      allowed: false,
      reason: 'Paket Starter dibatasi maksimal 5 budget kategori. Upgrade ke Pro untuk budget unlimited.',
      currentCount: userBudgets.length,
      maxAllowed: 5
    };
  }

  return { allowed: true, currentCount: userBudgets.length, maxAllowed: 5 };
}

/**
 * Check if user has access to receipt photo OCR
 */
export function canAccessReceiptOCR(profile: Profile): boolean {
  return profile.active_plan === 'pro';
}

/**
 * Check if user has access to AI Financial Advisor
 */
export function canAccessFinancialAdvisor(profile: Profile): boolean {
  return profile.active_plan === 'pro';
}

/**
 * Check if user has access to export PDF/Excel
 */
export function canAccessReportExport(profile: Profile): boolean {
  return profile.active_plan === 'pro';
}
