import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { Budget } from '@/types';
import { getCurrentMonthKeyWIB } from '@/lib/utils/timezone';
import { checkBudgetLimit } from '@/lib/plans/limits';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'user-demo-tatadana';
  const monthYear = searchParams.get('month') || getCurrentMonthKeyWIB();

  const budgets = Array.from(inMemoryStore.budgets.values())
    .filter(b => b.user_id === userId && b.month_year === monthYear);

  // Recalculate spent_amount and metrics from transactions in that month
  const enrichedBudgets = budgets.map(b => {
    const totalSpent = Array.from(inMemoryStore.transactions.values())
      .filter(t => t.user_id === userId && t.category_id === b.category_id && t.type === 'expense' && t.transaction_date.startsWith(monthYear))
      .reduce((s, t) => s + Number(t.amount), 0);
    
    b.spent_amount = totalSpent;
    const ratio = b.monthly_limit > 0 ? (totalSpent / b.monthly_limit) : 0;
    if (ratio >= 0.8) b.alert_80_sent = true;
    if (ratio >= 1.0) b.alert_100_sent = true;

    return {
      ...b,
      spent_amount: totalSpent,
      percentage_used: Math.min(100, Math.round(ratio * 100)),
      remaining_amount: Math.max(0, Number(b.monthly_limit) - totalSpent),
    };
  });

  return NextResponse.json({ ok: true, budgets: enrichedBudgets });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'user-demo-tatadana', categoryId, monthlyLimit, monthYear = getCurrentMonthKeyWIB() } = body;

    const limitCheck = checkBudgetLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ ok: false, message: limitCheck.reason }, { status: 403 });
    }

    const category = inMemoryStore.categories.get(categoryId);
    if (!category) {
      return NextResponse.json({ ok: false, message: 'Kategori tidak ditemukan' }, { status: 404 });
    }

    // Check if budget exists for this month
    let existing = Array.from(inMemoryStore.budgets.values())
      .find(b => b.user_id === userId && b.category_id === categoryId && b.month_year === monthYear);

    if (existing) {
      existing.monthly_limit = Number(monthlyLimit);
      existing.updated_at = new Date().toISOString();
      return NextResponse.json({ ok: true, budget: existing });
    }

    const newBudget: Budget = {
      id: `budget-${Date.now()}`,
      user_id: userId,
      category_id: categoryId,
      category_name: category.name,
      category_icon: category.icon,
      category_color: category.color,
      monthly_limit: Number(monthlyLimit),
      spent_amount: 0,
      month_year: monthYear,
      alert_80_sent: false,
      alert_100_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    inMemoryStore.budgets.set(newBudget.id, newBudget);
    return NextResponse.json({ ok: true, budget: newBudget });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
