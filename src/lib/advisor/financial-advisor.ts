import { Profile, Transaction, Budget } from '@/types';
import { canAccessFinancialAdvisor } from '@/lib/plans/limits';
import { callAIOrchestrator } from '@/lib/ai/orchestrator';
import { formatRupiah, getCurrentMonthKeyWIB } from '@/lib/utils/timezone';

export interface AdvisorTriggerResult {
  triggered: boolean;
  message?: string;
  reason?: 'category_spike' | 'high_monthly_burn' | 'large_single_expense' | 'category_budget_alert';
}

/**
 * Check if a newly recorded transaction triggers an AI Financial Advisor insight
 */
export async function evaluateFinancialAdvisorTriggers(
  profile: Profile,
  newTransaction: Transaction,
  allTransactions: Transaction[],
  budgets: Budget[]
): Promise<AdvisorTriggerResult> {
  // Pro plan only
  if (!canAccessFinancialAdvisor(profile)) {
    return { triggered: false };
  }

  // Only evaluate on expenses
  if (newTransaction.type !== 'expense') {
    return { triggered: false };
  }

  const curMonth = getCurrentMonthKeyWIB();
  const monthTx = allTransactions.filter(t => t.user_id === profile.id && t.transaction_date.startsWith(curMonth));
  const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) + Number(newTransaction.amount);

  const categoryBudget = budgets.find(b => b.category_id === newTransaction.category_id && (!b.month_year || b.month_year === curMonth));

  // Trigger 1: Pengeluaran besar (>20% budget kategori sekaligus)
  if (categoryBudget && categoryBudget.monthly_limit > 0) {
    const expenseRatio = Number(newTransaction.amount) / Number(categoryBudget.monthly_limit);
    if (expenseRatio >= 0.20) {
      const systemPrompt = `Kamu adalah AI Financial Advisor TataDana. Berikan nasihat singkat, bersahabat, dan actionable untuk pengguna Indonesia.`;
      const prompt = `Pengguna baru saja mengeluarkan ${formatRupiah(newTransaction.amount)} untuk kategori ${newTransaction.category_name || 'ini'}, yaitu ${(expenseRatio * 100).toFixed(0)}% dari total budget bulanan kategori tersebut (${formatRupiah(categoryBudget.monthly_limit)}).`;
      
      const aiRes = await callAIOrchestrator({
        feature: 'financial_advisor',
        systemPrompt,
        userPrompt: prompt,
        temperature: 0.3
      });

      const adviceText = aiRes?.text || `💡 Saran: Perhatikan sisa alokasi untuk pos ini agar tetap aman hingga akhir bulan.`;

      return {
        triggered: true,
        reason: 'large_single_expense',
        message: `🤖 Financial Advisor
Hei ${profile.full_name}! Pengeluaran barusan sebesar ${formatRupiah(newTransaction.amount)} memakan ${(expenseRatio * 100).toFixed(0)}% dari budget ${newTransaction.category_name} bulan ini.
${adviceText}`
      };
    }
  }

  // Trigger 2: Pengeluaran kategori bulanan sudah mencapai atau melebihi 80% dari batas budget kategori
  if (categoryBudget && categoryBudget.monthly_limit > 0) {
    const currentCategorySpent = monthTx
      .filter(t => t.category_id === newTransaction.category_id && t.type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0) + Number(newTransaction.amount);
    
    const catRatio = currentCategorySpent / Number(categoryBudget.monthly_limit);
    if (catRatio >= 0.80) {
      return {
        triggered: true,
        reason: 'category_budget_alert',
        message: `🤖 Financial Advisor
Perhatian ${profile.full_name}! Budget pos ${newTransaction.category_name} sudah terpakai ${(catRatio * 100).toFixed(0)}% (${formatRupiah(currentCategorySpent)} dari limit ${formatRupiah(categoryBudget.monthly_limit)}).
💡 Saran: Kurangi pengeluaran untuk kategori ini di sisa bulan agar tidak melampaui batas anggaran.`
      };
    }
  }

  // Trigger 3: Lonjakan Mingguan >50% (Weekly Surge dibandingkan 7 hari sebelumnya)
  const nowMs = Date.now();
  const past7DaysMs = nowMs - (7 * 24 * 60 * 60 * 1000);
  const prev7to14DaysMs = nowMs - (14 * 24 * 60 * 60 * 1000);

  const past7DaysExpense = allTransactions
    .filter(t => t.user_id === profile.id && t.type === 'expense' && t.category_id === newTransaction.category_id)
    .filter(t => {
      const txTime = new Date(t.transaction_date).getTime();
      return txTime >= past7DaysMs && txTime <= nowMs;
    })
    .reduce((s, t) => s + Number(t.amount), 0) + Number(newTransaction.amount);

  const prev7DaysExpense = allTransactions
    .filter(t => t.user_id === profile.id && t.type === 'expense' && t.category_id === newTransaction.category_id)
    .filter(t => {
      const txTime = new Date(t.transaction_date).getTime();
      return txTime >= prev7to14DaysMs && txTime < past7DaysMs;
    })
    .reduce((s, t) => s + Number(t.amount), 0);

  if (prev7DaysExpense > 50000 && past7DaysExpense >= 1.5 * prev7DaysExpense) {
    const surgePercent = Math.round(((past7DaysExpense - prev7DaysExpense) / prev7DaysExpense) * 100);
    return {
      triggered: true,
      reason: 'category_spike',
      message: `🤖 Financial Advisor
Hei ${profile.full_name}! Pengeluaran kategori ${newTransaction.category_name} minggu ini melonjak ${surgePercent}% dibanding minggu lalu (${formatRupiah(past7DaysExpense)} vs ${formatRupiah(prev7DaysExpense)}).
💡 Saran: Cek kembali pos pengeluaran ini dan pertimbangkan untuk menahan belanja non-esensial beberapa hari ke depan.`
    };
  }

  // Trigger 4: Total pengeluaran sudah >80% dari total pemasukan bulan ini (High Burn Rate)
  if (totalIncome > 0 && (totalExpense / totalIncome) >= 0.80) {
    const burnRatio = ((totalExpense / totalIncome) * 100).toFixed(0);
    return {
      triggered: true,
      reason: 'high_monthly_burn',
      message: `🤖 Financial Advisor
Hei ${profile.full_name}! Total pengeluaranmu bulan ini sudah mencapai ${burnRatio}% dari total pemasukan (${formatRupiah(totalExpense)} dari ${formatRupiah(totalIncome)}).
💡 Saran: Aktifkan mode hemat untuk sisa bulan ini, prioritaskan hanya kebutuhan pokok agar tidak defisit.`
    };
  }

  return { triggered: false };
}
