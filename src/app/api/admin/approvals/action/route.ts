import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { Profile, Wallet } from '@/types';

/**
 * Admin Approval Action API
 * POST /api/admin/approvals/action
 * 
 * Body: { registrationId, action: 'approve' | 'reject', adminNotes, adminId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      registrationId, 
      action, 
      adminNotes = '', 
      adminId = 'user-admin-tatadana' 
    } = body;

    if (!registrationId || !action) {
      return NextResponse.json({ ok: false, message: 'Registration ID dan action wajib diisi.' }, { status: 400 });
    }

    const pending = inMemoryStore.pendingRegistrations.get(registrationId);
    if (!pending) {
      return NextResponse.json({ ok: false, message: 'Permintaan pendaftaran tidak ditemukan.' }, { status: 404 });
    }

    if (action === 'approve') {
      pending.status = 'approved';
      pending.approved_at = new Date().toISOString();
      pending.admin_notes = adminNotes || 'Disetujui oleh Super Admin';

      // 1. Create active profile
      const newUserId = `user-${Date.now()}`;
      const newProfile: Profile = {
        id: newUserId,
        email: pending.email,
        full_name: pending.full_name,
        phone_number: pending.phone_number,
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
        updated_at: new Date().toISOString()
      };
      inMemoryStore.profiles.set(newUserId, newProfile);

      // 2. Initialize ALL 3 Wallets with EXACTLY balance: 0 (Rp0)
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

      // 3. Initialize Telegram Link strictly EMPTY and DISCONNECTED
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

      // 4. Record Audit Log
      inMemoryStore.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        admin_id: adminId,
        action: 'APPROVE_NEW_MEMBER',
        target_user_id: newUserId,
        target_user_name: pending.full_name,
        details: {
          registrationId,
          phone_number: pending.phone_number,
          email: pending.email,
          notes: adminNotes,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

      return NextResponse.json({
        ok: true,
        message: `Member ${pending.full_name} berhasil disetujui dan diaktifkan dengan saldo Rp0.`,
        user: newProfile,
        pendingRegistration: pending
      });
    } else if (action === 'reject') {
      pending.status = 'rejected';
      pending.admin_notes = adminNotes || 'Ditolak oleh Super Admin';

      inMemoryStore.auditLogs.unshift({
        id: `audit-${Date.now()}`,
        admin_id: adminId,
        action: 'REJECT_NEW_MEMBER',
        target_user_id: registrationId,
        target_user_name: pending.full_name,
        details: {
          phone_number: pending.phone_number,
          notes: adminNotes,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

      return NextResponse.json({
        ok: true,
        message: `Pendaftaran ${pending.full_name} telah ditolak.`,
        pendingRegistration: pending
      });
    } else {
      return NextResponse.json({ ok: false, message: 'Action tidak valid.' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
