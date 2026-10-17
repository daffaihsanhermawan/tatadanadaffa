import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore, supabaseAdmin } from '@/lib/supabase/db-service';
import { PlanType } from '@/types';

/**
 * Admin Member Role & Plan Switcher API
 * POST /api/admin/users/role
 * 
 * Switches member role between 'starter' and 'pro' (or 'superadmin')
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      userId, 
      role, 
      plan, 
      is_superadmin, 
      adminId = 'user-admin-tatadana', 
      reason = 'Diperbarui via Super Admin Portal' 
    } = body;

    if (!userId) {
      return NextResponse.json({ ok: false, message: 'User ID wajib disertakan.' }, { status: 400 });
    }

    const profile = inMemoryStore.profiles.get(userId);
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const previousPlan = profile.active_plan;
    const previousIsSuperadmin = profile.is_superadmin;

    // Resolve target plan and superadmin flag
    let newPlan: PlanType = profile.active_plan;
    let newIsSuperadmin: boolean = profile.is_superadmin;

    if (plan && (plan === 'starter' || plan === 'pro')) {
      newPlan = plan;
    }

    if (role) {
      if (role === 'starter') {
        newPlan = 'starter';
        if (typeof is_superadmin !== 'boolean') newIsSuperadmin = false;
      } else if (role === 'pro') {
        newPlan = 'pro';
      } else if (role === 'superadmin') {
        newPlan = 'pro';
        newIsSuperadmin = true;
      }
    }

    if (typeof is_superadmin === 'boolean') {
      newIsSuperadmin = is_superadmin;
    }

    // 1. Update In-Memory Data Store
    profile.active_plan = newPlan;
    profile.is_superadmin = newIsSuperadmin;
    profile.updated_at = new Date().toISOString();

    // 2. Synchronize to Supabase if configured (real environment)
    let supabaseSynced = false;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('mock-tatadana');

    if (isSupabaseConfigured) {
      try {
        const { error: syncError } = await supabaseAdmin
          .from('profiles')
          .update({
            active_plan: newPlan,
            is_superadmin: newIsSuperadmin,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (!syncError) {
          supabaseSynced = true;
        }
      } catch (syncErr) {
        // Fallback silently
      }
    }

    // 3. Record Mandatory Admin Audit Log
    const auditRecord = {
      id: `audit-${Date.now()}`,
      admin_id: adminId,
      action: 'UPDATE_USER_ROLE_PLAN',
      target_user_id: userId,
      target_user_name: profile.full_name || 'Unknown',
      details: {
        previous_plan: previousPlan,
        new_plan: newPlan,
        previous_is_superadmin: previousIsSuperadmin,
        new_is_superadmin: newIsSuperadmin,
        reason,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };
    inMemoryStore.auditLogs.unshift(auditRecord);

    const roleName = newIsSuperadmin ? 'Superadmin (Pro)' : newPlan.toUpperCase();

    return NextResponse.json({
      ok: true,
      message: `Role pengguna ${profile.full_name} berhasil diperbarui menjadi ${roleName}.`,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone_number: profile.phone_number,
        active_plan: profile.active_plan,
        is_superadmin: profile.is_superadmin,
        updated_at: profile.updated_at
      },
      auditRecorded: true,
      supabaseSynced
    });
  } catch (error: any) {
    console.error('[Admin Role Switcher] Error:', error);
    return NextResponse.json({ ok: false, message: error?.message || 'Server error' }, { status: 500 });
  }
}
