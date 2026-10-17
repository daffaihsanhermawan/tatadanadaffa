import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { Wallet, Profile } from '@/types';

/**
 * User Registration API
 * POST /api/auth/register
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = (body.fullName || body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phoneNumber || body.phone || '').trim().replace(/^\+62/, '0');
    const password = body.password || '';

    if (!fullName) {
      return NextResponse.json({ ok: false, message: 'Nama lengkap wajib diisi.' }, { status: 400 });
    }

    // Check for existing profile by email or phone
    for (const [, p] of Array.from(inMemoryStore.profiles.entries())) {
      if (email && p.email?.toLowerCase() === email) {
        return NextResponse.json({ ok: false, message: 'Email sudah terdaftar. Silakan login.' }, { status: 400 });
      }
      if (phone && p.phone_number === phone) {
        return NextResponse.json({ ok: false, message: 'Nomor HP sudah terdaftar. Silakan login.' }, { status: 400 });
      }
    }

    const newUserId = `user-${Date.now()}`;
    const newProfile: Profile = {
      id: newUserId,
      email: email || undefined,
      full_name: fullName,
      phone_number: phone || null,
      phone_verified: true,
      avatar_url: null,
      active_plan: 'starter',
      billing_type: 'monthly',
      default_currency: 'IDR',
      reminder_enabled: true,
      reminder_frequency: 1,
      reminder_time_1: '08:00',
      reminder_time_2: '20:00',
      is_superadmin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.profiles.set(newUserId, newProfile);
    inMemoryStore.setActiveTelegramUser(newUserId);

    // Initialize ALL 3 Wallets with EXACTLY balance: 0 (Rp0)
    const defWallet: Wallet = {
      id: `wallet-${Date.now()}-1`,
      user_id: newUserId,
      name: 'BCA Utama',
      type: 'bank',
      balance: 0,
      is_default: true,
      color: '#00529C',
      icon: 'landmark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const gopayWallet: Wallet = {
      id: `wallet-${Date.now()}-2`,
      user_id: newUserId,
      name: 'GoPay',
      type: 'ewallet',
      balance: 0,
      is_default: false,
      color: '#00AED6',
      icon: 'smartphone',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const cashWallet: Wallet = {
      id: `wallet-${Date.now()}-3`,
      user_id: newUserId,
      name: 'Dompet Tunai',
      type: 'cash',
      balance: 0,
      is_default: false,
      color: '#10B981',
      icon: 'banknote',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.wallets.set(defWallet.id, defWallet);
    inMemoryStore.wallets.set(gopayWallet.id, gopayWallet);
    inMemoryStore.wallets.set(cashWallet.id, cashWallet);

    // Initialize Telegram Link strictly EMPTY and DISCONNECTED
    inMemoryStore.telegramLinks.set(newUserId, {
      id: `tg-link-${Date.now()}`,
      user_id: newUserId,
      telegram_user_id: null,
      telegram_chat_id: null,
      bot_token_encrypted: null,
      bot_token_raw: '',
      bot_username: null,
      status_koneksi: 'disconnected',
      connection_mode: 'polling',
      webhook_url: null,
      linked_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      user: newProfile,
      message: `Akun ${newProfile.full_name} berhasil dibuat dengan saldo Rp0!`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
