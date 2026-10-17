import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { Profile } from '@/types';

/**
 * Strict User Login API
 * POST /api/auth/login
 * Strictly matches existing users by email, phone, or name.
 * Does NOT auto-create accounts. Superadmin status is strictly read from stored profile.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier = (body.emailOrNameOrPhone || body.email || body.username || '').trim();
    const password = body.password || '';

    if (!identifier) {
      return NextResponse.json({ ok: false, message: 'Masukkan Email, Username, atau Nama Anda.' }, { status: 400 });
    }

    const cleanInput = identifier.toLowerCase();
    const isEmail = identifier.includes('@');
    const isPhone = /^[0-9+]+$/.test(identifier);

    // 0. Check if user is awaiting Admin Approval
    for (const [, reg] of Array.from(inMemoryStore.pendingRegistrations.entries())) {
      if (reg.status === 'pending') {
        const regPhone = reg.phone_number.replace(/^\+62/, '0');
        const regEmail = (reg.email || '').toLowerCase();
        const regName = reg.full_name.toLowerCase();

        if (
          (isPhone && (regPhone === cleanInput || regPhone === cleanInput.replace(/^0/, '62'))) ||
          (isEmail && regEmail && regEmail === cleanInput) ||
          (regName === cleanInput)
        ) {
          return NextResponse.json({
            ok: false,
            isPendingApproval: true,
            message: 'Pendaftaran Anda sedang diproses. Silahkan menunggu konfirmasi WhatsApp dari Admin (089531331333).'
          }, { status: 403 });
        }
      }
    }

    // 1. Search existing profiles
    let matchedProfile: Profile | null = null;

    for (const [, p] of Array.from(inMemoryStore.profiles.entries())) {
      const pEmail = (p.email || '').toLowerCase();
      const pPhone = (p.phone_number || '').replace(/^\+62/, '0');
      const pName = (p.full_name || '').toLowerCase();

      if (isEmail && pEmail === cleanInput) {
        matchedProfile = p;
        break;
      } else if (isPhone && (pPhone === cleanInput || pPhone === cleanInput.replace(/^0/, '62'))) {
        matchedProfile = p;
        break;
      } else if (!isEmail && !isPhone && (pName === cleanInput || pName.includes(cleanInput) || cleanInput.includes(pName))) {
        matchedProfile = p;
        break;
      }
    }

    // 2. If matched: sync active user for Telegram bot & return user profile
    if (matchedProfile) {
      inMemoryStore.setActiveTelegramUser(matchedProfile.id);

      return NextResponse.json({
        ok: true,
        user: matchedProfile,
        message: `Selamat datang kembali, ${matchedProfile.full_name}!`
      });
    }

    // 3. Strictly reject login if user is not found in stored profiles
    return NextResponse.json({
      ok: false,
      message: 'Akun tidak ditemukan. Silakan periksa kembali email atau nomor HP Anda, atau daftar akun baru.'
    }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
