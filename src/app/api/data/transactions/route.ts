import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { Transaction } from '@/types';
import { getWIBDate } from '@/lib/utils/timezone';
import { checkTransactionLimit } from '@/lib/plans/limits';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'user-demo-tatadana';
  const category = searchParams.get('category');
  const wallet = searchParams.get('wallet');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  let list = Array.from(inMemoryStore.transactions.values())
    .filter(t => t.user_id === userId)
    .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

  if (category && category !== 'all') {
    list = list.filter(t => t.category_id === category || t.category_name === category);
  }
  if (wallet && wallet !== 'all') {
    list = list.filter(t => t.wallet_id === wallet || t.wallet_name === wallet);
  }
  if (type && type !== 'all') {
    list = list.filter(t => t.type === type);
  }
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(t => 
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      (t.merchant_name && t.merchant_name.toLowerCase().includes(q)) ||
      (t.category_name && t.category_name.toLowerCase().includes(q))
    );
  }
  if (startDate) {
    const start = new Date(startDate.includes('T') ? startDate : `${startDate}T00:00:00.000Z`);
    list = list.filter(t => new Date(t.transaction_date) >= start);
  }
  if (endDate) {
    const end = new Date(endDate.includes('T') ? endDate : `${endDate}T23:59:59.999Z`);
    list = list.filter(t => new Date(t.transaction_date) <= end);
  }

  return NextResponse.json({ ok: true, transactions: list });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'user-demo-tatadana', walletId, categoryId, type, amount, notes, merchantName, transferToWalletId, transactionDate } = body;

    const limitCheck = await checkTransactionLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ ok: false, message: limitCheck.reason }, { status: 403 });
    }

    let selectedWalletId = walletId;
    if (!selectedWalletId) {
      const userWallets = Array.from(inMemoryStore.wallets.values()).filter(w => w.user_id === userId);
      selectedWalletId = userWallets[0]?.id || Array.from(inMemoryStore.wallets.keys())[0];
    }

    const wallet = inMemoryStore.wallets.get(selectedWalletId);
    if (!wallet) {
      return NextResponse.json({ ok: false, message: 'Dompet tidak ditemukan.' }, { status: 404 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ ok: false, message: 'Nominal tidak valid.' }, { status: 400 });
    }

    const category = categoryId ? inMemoryStore.categories.get(categoryId) : null;

    // Update balances
    if (type === 'income') {
      wallet.balance = Number(wallet.balance) + numAmount;
    } else if (type === 'expense') {
      wallet.balance = Number(wallet.balance) - numAmount;
    } else if (type === 'transfer') {
      if (!transferToWalletId || transferToWalletId === walletId) {
        return NextResponse.json({ ok: false, message: 'Pilih dompet tujuan transfer yang berbeda.' }, { status: 400 });
      }
      const targetWallet = inMemoryStore.wallets.get(transferToWalletId);
      if (!targetWallet) {
        return NextResponse.json({ ok: false, message: 'Dompet tujuan tidak ditemukan.' }, { status: 404 });
      }
      wallet.balance = Number(wallet.balance) - numAmount;
      targetWallet.balance = Number(targetWallet.balance) + numAmount;
    }

    const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const inputDate = transactionDate || body.transaction_date;
    let finalTxDate = getWIBDate().toISOString();
    if (inputDate) {
      try {
        finalTxDate = new Date(inputDate).toISOString();
      } catch {
        finalTxDate = getWIBDate().toISOString();
      }
    }

    const newTx: Transaction = {
      id: txId,
      user_id: userId,
      wallet_id: wallet.id,
      wallet_name: wallet.name,
      category_id: category ? category.id : null,
      category_name: category ? category.name : (type === 'transfer' ? 'Transfer Antar Dompet' : 'Lainnya'),
      category_icon: category ? category.icon : (type === 'transfer' ? '🔁' : '📁'),
      type: type as any,
      amount: numAmount,
      notes: notes || '',
      transaction_date: finalTxDate,
      source: 'web',
      merchant_name: merchantName || null,
      transfer_to_wallet_id: transferToWalletId || null,
      transfer_to_wallet_name: transferToWalletId ? inMemoryStore.wallets.get(transferToWalletId)?.name : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    inMemoryStore.transactions.set(txId, newTx);

    return NextResponse.json({ ok: true, transaction: newTx });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
