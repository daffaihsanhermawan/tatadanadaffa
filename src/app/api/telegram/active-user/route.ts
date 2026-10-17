import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';

/**
 * Sync Active User for Telegram Bot
 * GET /api/telegram/active-user
 * POST /api/telegram/active-user
 */

export async function GET() {
  const activeUserId = inMemoryStore.getActiveTelegramUser();
  const profile = inMemoryStore.profiles.get(activeUserId);
  return NextResponse.json({
    ok: true,
    activeUserId,
    user: profile ? {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      active_plan: profile.active_plan
    } : null
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ ok: false, message: 'User ID wajib diisi.' }, { status: 400 });
    }

    const profile = inMemoryStore.profiles.get(userId);
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    inMemoryStore.setActiveTelegramUser(userId);

    return NextResponse.json({
      ok: true,
      activeUserId: userId,
      message: `Bot Telegram aktif disinkronkan ke akun ${profile.full_name}.`,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        active_plan: profile.active_plan
      }
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
