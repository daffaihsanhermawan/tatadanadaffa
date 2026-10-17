import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore, supabaseAdmin } from '@/lib/supabase/db-service';
import { Transaction } from '@/types';
import { getWIBDate } from '@/lib/utils/timezone';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Format a Date or ISO string to 'YYYY-MM-DD' in Asia/Jakarta (WIB) timezone
 */
function toWIBDateString(dateInput: Date | string | number): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  } catch {
    const wib = getWIBDate(dateInput);
    const y = wib.getFullYear();
    const m = String(wib.getMonth() + 1).padStart(2, '0');
    const day = String(wib.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

/**
 * Financial Calendar Data Aggregation API
 * GET /api/data/calendar?userId=...&year=2026&month=10
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const targetUserId = userIdParam || inMemoryStore.getActiveTelegramUser() || 'user-demo-tatadana';

    const nowWIB = getWIBDate();
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    let yearNum: number;
    let monthNum: number;

    if (monthParam && monthParam.includes('-')) {
      const [yPart, mPart] = monthParam.split('-');
      yearNum = parseInt(yPart, 10);
      monthNum = parseInt(mPart, 10);
    } else {
      yearNum = yearParam ? parseInt(yearParam, 10) : nowWIB.getFullYear();
      monthNum = monthParam ? parseInt(monthParam, 10) : (nowWIB.getMonth() + 1);
    }

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return NextResponse.json(
        { ok: false, message: 'Parameter month (1-12) atau year tidak valid.' },
        { status: 400 }
      );
    }

    const monthKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    // 1. Fetch user transactions from inMemoryStore or Supabase
    let userTransactions: Transaction[] = [];
    const isRealSupabase = 
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock-tatadana');

    if (isRealSupabase) {
      try {
        const startBuffer = new Date(Date.UTC(yearNum, monthNum - 1, 1, -7, 0, 0)).toISOString();
        const endBuffer = new Date(Date.UTC(yearNum, monthNum, 1, 6, 59, 59, 999)).toISOString();

        const { data, error } = await supabaseAdmin
          .from('transactions')
          .select('*')
          .eq('user_id', targetUserId)
          .gte('transaction_date', startBuffer)
          .lte('transaction_date', endBuffer)
          .order('transaction_date', { ascending: true });

        if (!error && data) {
          userTransactions = data as Transaction[];
        } else {
          userTransactions = Array.from(inMemoryStore.transactions.values())
            .filter(t => t.user_id === targetUserId);
        }
      } catch {
        userTransactions = Array.from(inMemoryStore.transactions.values())
          .filter(t => t.user_id === targetUserId);
      }
    } else {
      userTransactions = Array.from(inMemoryStore.transactions.values())
        .filter(t => t.user_id === targetUserId);
    }

    // 2. Group transactions by WIB date string (YYYY-MM-DD)
    const txByDateMap = new Map<string, Transaction[]>();

    for (const tx of userTransactions) {
      const dateKey = toWIBDateString(tx.transaction_date);
      if (dateKey && dateKey.startsWith(monthKey)) {
        if (!txByDateMap.has(dateKey)) {
          txByDateMap.set(dateKey, []);
        }
        txByDateMap.get(dateKey)!.push(tx);
      }
    }

    // 3. Build day-by-day calendar data for all days in month
    const days: any[] = [];
    const byDate: Record<string, any> = {};

    let monthlyTotalIncome = 0;
    let monthlyTotalExpense = 0;
    let totalMonthTxCount = 0;
    let peakExpenseDay: { date: string; amount: number } | null = null;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${monthKey}-${dayStr}`;
      const dayTransactions = txByDateMap.get(dateKey) || [];

      // Sort newest first
      dayTransactions.sort((a, b) => 
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      );

      let dayIncome = 0;
      let dayExpense = 0;

      for (const tx of dayTransactions) {
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'income') {
          dayIncome += amount;
        } else if (tx.type === 'expense') {
          dayExpense += amount;
        }
      }

      const dayNet = dayIncome - dayExpense;

      monthlyTotalIncome += dayIncome;
      monthlyTotalExpense += dayExpense;
      totalMonthTxCount += dayTransactions.length;

      if (dayExpense > (peakExpenseDay?.amount || 0)) {
        peakExpenseDay = { date: dateKey, amount: dayExpense };
      }

      const daySummary = {
        date: dateKey,
        dayNumber: d,
        day: d,
        totalIncome: dayIncome,
        totalExpense: dayExpense,
        net: dayNet,
        transactionCount: dayTransactions.length,
        transactions: dayTransactions,
      };

      days.push(daySummary);
      byDate[dateKey] = daySummary;
    }

    const monthlyNet = monthlyTotalIncome - monthlyTotalExpense;

    return NextResponse.json({
      ok: true,
      userId: targetUserId,
      year: yearNum,
      month: monthNum,
      monthKey,
      daysInMonth,
      summary: {
        monthlyTotalIncome,
        monthlyTotalExpense,
        monthlyNet,
        transactionCount: totalMonthTxCount,
        peakExpenseDay
      },
      days,
      byDate,
      dailyData: byDate // Backward compatible alias
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Gagal memproses data kalender keuangan' },
      { status: 500 }
    );
  }
}
