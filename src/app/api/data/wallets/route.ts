import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { Wallet } from '@/types';
import { checkWalletLimit } from '@/lib/plans/limits';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'user-demo-tatadana';
  const wallets = Array.from(inMemoryStore.wallets.values()).filter(w => w.user_id === userId);
  return NextResponse.json({ ok: true, wallets });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'user-demo-tatadana', name, type = 'bank', balance = 0, isDefault = false, color = '#FF6B00' } = body;

    const limitCheck = checkWalletLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ ok: false, message: limitCheck.reason }, { status: 403 });
    }

    if (isDefault) {
      for (const w of inMemoryStore.wallets.values()) {
        if (w.user_id === userId) w.is_default = false;
      }
    }

    const walletId = `wallet-${Date.now()}`;
    const newWallet: Wallet = {
      id: walletId,
      user_id: userId,
      name,
      type: type as any,
      balance: Number(balance) || 0,
      is_default: Boolean(isDefault),
      color,
      icon: type === 'cash' ? 'banknote' : type === 'ewallet' ? 'smartphone' : 'landmark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    inMemoryStore.wallets.set(walletId, newWallet);
    return NextResponse.json({ ok: true, wallet: newWallet });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletId, name, balance, isDefault, color } = body;

    const wallet = inMemoryStore.wallets.get(walletId);
    if (!wallet) {
      return NextResponse.json({ ok: false, message: 'Dompet tidak ditemukan.' }, { status: 404 });
    }

    if (name) wallet.name = name;
    if (balance !== undefined) wallet.balance = Number(balance);
    if (color) wallet.color = color;

    if (isDefault) {
      for (const w of inMemoryStore.wallets.values()) {
        if (w.user_id === wallet.user_id) w.is_default = false;
      }
      wallet.is_default = true;
    }

    wallet.updated_at = new Date().toISOString();
    return NextResponse.json({ ok: true, wallet });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletId = searchParams.get('id');
    if (!walletId) return NextResponse.json({ ok: false, message: 'ID dompet diperlukan' }, { status: 400 });

    inMemoryStore.wallets.delete(walletId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
