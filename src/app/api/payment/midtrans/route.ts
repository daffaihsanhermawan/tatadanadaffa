import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { Subscription, PlanType } from '@/types';

/**
 * Midtrans Payment & Manual Bank Transfer API
 * POST /api/payment/midtrans
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, plan = 'pro', method = 'midtrans', proofUrl } = body;

    const profile = inMemoryStore.profiles.get(userId || 'user-demo-tatadana');
    if (!profile) {
      return NextResponse.json({ ok: false, message: 'User tidak ditemukan' }, { status: 404 });
    }

    const amount = plan === 'starter' ? 49000 : 99000;
    const orderId = `TATADANA-${plan.toUpperCase()}-${Date.now()}`;

    // Action 1: Create Payment Transaction
    if (action === 'create_order') {
      const sub: Subscription = {
        id: `sub-${Date.now()}`,
        user_id: profile.id,
        user_name: profile.full_name,
        user_phone: profile.phone_number || undefined,
        plan: plan as PlanType,
        billing_type: plan === 'starter' ? 'monthly' : 'lifetime',
        amount,
        status: method === 'midtrans' ? 'pending' : 'pending',
        payment_method: method as any,
        midtrans_order_id: orderId,
        proof_image_url: proofUrl || null,
        created_at: new Date().toISOString(),
      };

      inMemoryStore.subscriptions.unshift(sub);

      return NextResponse.json({
        ok: true,
        orderId,
        amount,
        plan,
        snapToken: `MOCK_SNAP_TOKEN_${orderId}`,
        redirectUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${orderId}`,
        bankTransferInfo: {
          bank: 'BCA (Bank Central Asia)',
          accountNumber: '8830-1928-3391',
          accountName: 'PT Tata Dana Finansial',
          amount,
          instructions: 'Transfer tepat sesuai nominal dan unggah bukti transfer di dashboard.'
        }
      });
    }

    // Action 2: Midtrans Webhook Notification / Callback
    if (action === 'notification') {
      const { order_id, transaction_status } = body;
      const sub = inMemoryStore.subscriptions.find(s => s.midtrans_order_id === order_id);
      if (sub) {
        if (transaction_status === 'settlement' || transaction_status === 'capture') {
          sub.status = 'active';
          profile.active_plan = sub.plan;
          profile.billing_type = sub.billing_type;
        } else if (transaction_status === 'expire' || transaction_status === 'cancel') {
          sub.status = 'rejected';
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Action 3: Admin Manual Approve / Reject
    if (action === 'admin_decision') {
      const { subscriptionId, decision, adminNotes } = body;
      const sub = inMemoryStore.subscriptions.find(s => s.id === subscriptionId);
      if (!sub) {
        return NextResponse.json({ ok: false, message: 'Data langganan tidak ditemukan' }, { status: 404 });
      }

      if (decision === 'approve') {
        sub.status = 'active';
        sub.admin_notes = adminNotes || 'Disetujui oleh admin';
        const targetProfile = inMemoryStore.profiles.get(sub.user_id);
        if (targetProfile) {
          targetProfile.active_plan = sub.plan;
          targetProfile.billing_type = sub.billing_type;
        }
      } else {
        sub.status = 'rejected';
        sub.admin_notes = adminNotes || 'Ditolak oleh admin';
      }

      return NextResponse.json({ ok: true, subscription: sub });
    }

    return NextResponse.json({ ok: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
