import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore, supabaseAdmin } from '@/lib/supabase/db-service';

/**
 * GET /api/user/profile?userId=...
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'user-demo-tatadana';

  const profile = inMemoryStore.profiles.get(userId);
  if (!profile) {
    return NextResponse.json({ ok: false, message: 'User tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, profile, user: profile });
}

/**
 * PUT /api/user/profile
 * POST /api/user/profile
 * Accepts { userId, fullName, avatarUrl, full_name, avatar_url }
 */
async function handleUpdate(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId || body.user_id || 'user-demo-tatadana';
    const fullName = body.fullName || body.full_name;
    const avatarUrl = body.avatarUrl !== undefined ? body.avatarUrl : body.avatar_url;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { ok: false, message: 'Nama lengkap wajib diisi.' },
        { status: 400 }
      );
    }

    let profile = inMemoryStore.profiles.get(userId);

    if (!profile) {
      for (const [, p] of Array.from(inMemoryStore.profiles.entries())) {
        if (p.id === userId) {
          profile = p;
          break;
        }
      }
    }

    const updatedAt = new Date().toISOString();

    if (!profile) {
      profile = {
        id: userId,
        full_name: fullName.trim(),
        avatar_url: avatarUrl ?? null,
        phone_number: body.phoneNumber || '081234567890',
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
      profile.full_name = fullName.trim();
      profile.avatar_url = avatarUrl !== undefined ? avatarUrl : profile.avatar_url;
      profile.updated_at = updatedAt;
      inMemoryStore.profiles.set(profile.id, profile);
    }

    // Mirror to Supabase if configured
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
      console.warn('Supabase profile sync skipped:', dbErr);
    }

    return NextResponse.json({
      ok: true,
      message: 'Profil dan foto berhasil diperbarui!',
      profile,
      user: profile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || 'Gagal memperbarui profil' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return handleUpdate(req);
}

export async function POST(req: NextRequest) {
  return handleUpdate(req);
}
