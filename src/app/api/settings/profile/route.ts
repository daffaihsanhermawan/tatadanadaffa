import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore, supabaseAdmin } from '@/lib/supabase/db-service';
import { Profile } from '@/types';

/**
 * GET /api/settings/profile?userId=...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'user-demo-tatadana';

  const profile = inMemoryStore.profiles.get(userId);
  if (!profile) {
    return NextResponse.json({ ok: false, message: 'User tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, profile });
}

/**
 * POST /api/settings/profile
 * Updates user full_name and avatar_url
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId = 'user-demo-tatadana', full_name, avatar_url } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { ok: false, message: 'Nama lengkap wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Fetch existing profile from inMemoryStore
    let profile = inMemoryStore.profiles.get(userId);

    if (!profile) {
      // Fallback search by ID across stored profiles
      for (const [, p] of Array.from(inMemoryStore.profiles.entries())) {
        if (p.id === userId) {
          profile = p;
          break;
        }
      }
    }

    const updatedAt = new Date().toISOString();

    if (!profile) {
      // Fallback create if missing
      profile = {
        id: userId,
        full_name: full_name.trim(),
        avatar_url: avatar_url ?? null,
        phone_number: '081234567890',
        phone_verified: true,
        active_plan: 'starter',
        billing_type: 'monthly',
        default_currency: 'IDR',
        reminder_enabled: true,
        reminder_frequency: 1,
        reminder_time_1: '08:00',
        reminder_time_2: '20:00',
        is_superadmin: false,
        created_at: updatedAt,
        updated_at: updatedAt,
      };
      inMemoryStore.profiles.set(userId, profile);
    } else {
      // 2. Mutate in-memory profile
      profile.full_name = full_name.trim();
      profile.avatar_url = avatar_url !== undefined ? avatar_url : profile.avatar_url;
      profile.updated_at = updatedAt;
      inMemoryStore.profiles.set(profile.id, profile);
    }

    // 3. Mirror update to Supabase DB if real connection configured
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('mock-tatadana')) {
        await supabaseAdmin
          .from('profiles')
          .update({
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            updated_at: profile.updated_at,
          })
          .eq('id', profile.id);
      }
    } catch (dbErr) {
      console.warn('Supabase profile sync skipped / error:', dbErr);
    }

    return NextResponse.json({
      ok: true,
      message: 'Profil dan foto berhasil diperbarui!',
      profile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Gagal memperbarui profil' },
      { status: 500 }
    );
  }
}
