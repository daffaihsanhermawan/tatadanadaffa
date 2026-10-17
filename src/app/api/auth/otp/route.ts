import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';

/**
 * Phone OTP Verification API (Send & Verify OTP)
 * POST /api/auth/otp
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || (body.otp || body.otpCode ? 'verify' : 'send');
    const identifier = (body.phoneNumber || body.phoneOrEmail || body.email || '').trim();
    const otpCode = body.otpCode || body.otp || '';
    const fullName = body.fullName || '';

    if (!identifier) {
      return NextResponse.json({ ok: false, message: 'Nomor HP atau Email wajib diisi.' }, { status: 400 });
    }

    const isEmail = identifier.includes('@');
    const cleanKey = isEmail ? identifier.toLowerCase() : identifier.replace(/^\+62/, '0').replace(/\D/g, '');

    // Action 1: Send OTP
    if (action === 'send') {
      const code = '123456';
      const expires = Date.now() + (5 * 60 * 1000); // 5 minutes validity

      inMemoryStore.phoneOtps.set(cleanKey, {
        code,
        expires,
        verified: false
      });

      console.log(`[OTP SENT] To: ${cleanKey} | Code: ${code} (Berlaku 5 menit)`);

      return NextResponse.json({
        ok: true,
        message: `Kode OTP 6-digit telah dikirim ke ${cleanKey}. (Gunakan kode demo: 123456)`,
        demoCode: '123456'
      });
    }

    // Action 2: Verify OTP
    if (action === 'verify') {
      if (!otpCode) {
        return NextResponse.json({ ok: false, message: 'Kode OTP wajib diisi.' }, { status: 400 });
      }

      const stored = inMemoryStore.phoneOtps.get(cleanKey);
      const isDemoCode = otpCode === '123456';

      if (!isDemoCode && (!stored || stored.expires < Date.now() || stored.code !== otpCode)) {
        return NextResponse.json({ ok: false, message: 'Kode OTP tidak valid atau telah kadaluarsa.' }, { status: 400 });
      }

      if (stored) stored.verified = true;

      // Find or create user
      let matchedUserId: string | null = null;
      for (const [uid, p] of Array.from(inMemoryStore.profiles.entries())) {
        if (isEmail && p.email?.toLowerCase() === cleanKey) {
          matchedUserId = uid;
          break;
        } else if (!isEmail && p.phone_number === cleanKey) {
          matchedUserId = uid;
          break;
        }
      }

      if (!matchedUserId) {
        // Create new user profile
        matchedUserId = `user-${Date.now()}`;
        const newProfile = {
          id: matchedUserId,
          full_name: fullName || 'Pengguna Baru',
          phone_number: isEmail ? null : cleanKey,
          email: isEmail ? cleanKey : undefined,
          phone_verified: true,
          avatar_url: null,
          active_plan: 'starter' as const,
          billing_type: 'monthly' as const,
          default_currency: 'IDR',
          reminder_enabled: true,
          reminder_frequency: 1 as const,
          reminder_time_1: '08:00',
          reminder_time_2: '20:00',
          is_superadmin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        inMemoryStore.profiles.set(matchedUserId, newProfile);

        // Create default wallet
        const defWallet = {
          id: `wallet-${Date.now()}`,
          user_id: matchedUserId,
          name: 'Dompet Utama',
          type: 'bank' as const,
          balance: 0,
          is_default: true,
          color: '#FF6B00',
          icon: 'wallet',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        inMemoryStore.wallets.set(defWallet.id, defWallet);
      } else {
        const p = inMemoryStore.profiles.get(matchedUserId)!;
        p.phone_verified = true;
      }

      const userProfile = inMemoryStore.profiles.get(matchedUserId);

      return NextResponse.json({
        ok: true,
        message: 'Nomor HP berhasil diverifikasi!',
        user: userProfile
      });
    }

    return NextResponse.json({ ok: false, message: 'Aksi tidak valid.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
