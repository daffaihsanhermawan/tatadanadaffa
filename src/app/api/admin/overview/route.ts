import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { encryptSecret } from '@/lib/utils/encryption';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'overview';
  const targetUserId = searchParams.get('targetUserId');
  const adminId = searchParams.get('adminId') || 'user-demo-tatadana';

  // 1. Overview metrics
  if (action === 'overview') {
    const totalUsers = inMemoryStore.profiles.size;
    const proUsers = Array.from(inMemoryStore.profiles.values()).filter(p => p.active_plan === 'pro').length;
    const totalTransactions = inMemoryStore.transactions.size;
    const totalAiCalls = inMemoryStore.aiLogs.length;

    const usersList = Array.from(inMemoryStore.profiles.values()).map(p => {
      const tg = inMemoryStore.telegramLinks.get(p.id);
      return {
        ...p,
        telegramConnected: tg?.status_koneksi === 'connected',
        telegramUsername: tg?.bot_username || null,
      };
    });

    const aiProviders = Array.from(inMemoryStore.aiProviders.values());
    const aiLogs = inMemoryStore.aiLogs.slice(0, 50);
    const subscriptions = inMemoryStore.subscriptions;
    const auditLogs = inMemoryStore.auditLogs.slice(0, 50);

    return NextResponse.json({
      ok: true,
      stats: {
        totalUsers,
        proUsers,
        starterUsers: totalUsers - proUsers,
        totalTransactions,
        totalAiCalls,
      },
      users: usersList,
      aiProviders,
      aiLogs,
      subscriptions,
      auditLogs
    });
  }

  // 2. View user transactions for support (WITH MANDATORY AUDIT LOG)
  if (action === 'inspect_user_transactions') {
    if (!targetUserId) {
      return NextResponse.json({ ok: false, message: 'Target user ID required' }, { status: 400 });
    }

    const targetUser = inMemoryStore.profiles.get(targetUserId);
    const userTx = Array.from(inMemoryStore.transactions.values()).filter(t => t.user_id === targetUserId);

    // Record Audit Log (Part 10 requirement)
    const auditRecord = {
      id: `audit-${Date.now()}`,
      admin_id: adminId,
      action: 'VIEW_USER_TRANSACTIONS',
      target_user_id: targetUserId,
      target_user_name: targetUser?.full_name || 'Unknown',
      details: {
        transaction_count: userTx.length,
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    };
    inMemoryStore.auditLogs.unshift(auditRecord);

    return NextResponse.json({
      ok: true,
      targetUser,
      transactions: userTx,
      auditRecorded: true
    });
  }

  // 3. Export all platform data
  if (action === 'export_all_data') {
    const exportPayload = {
      timestamp: new Date().toISOString(),
      platform: 'TataDana Finansial',
      users: Array.from(inMemoryStore.profiles.values()),
      transactions: Array.from(inMemoryStore.transactions.values()),
      wallets: Array.from(inMemoryStore.wallets.values()),
      budgets: Array.from(inMemoryStore.budgets.values()),
      subscriptions: inMemoryStore.subscriptions,
      aiLogs: inMemoryStore.aiLogs
    };

    return NextResponse.json({
      ok: true,
      exportPayload
    });
  }

  return NextResponse.json({ ok: false, message: 'Action not found' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, providerName, apiKey, mode, isActive, priority, modelName } = body;

    // Update AI Provider
    if (action === 'update_ai_provider') {
      const provider = inMemoryStore.aiProviders.get(providerName);
      if (!provider) {
        return NextResponse.json({ ok: false, message: 'Provider tidak ditemukan' }, { status: 404 });
      }

      if (apiKey) provider.api_key_encrypted = encryptSecret(apiKey);
      if (mode) provider.mode = mode;
      if (typeof isActive === 'boolean') provider.is_active = isActive;
      if (priority) provider.priority = Number(priority);
      if (modelName) provider.model_name = modelName;

      return NextResponse.json({ ok: true, provider });
    }

    return NextResponse.json({ ok: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message }, { status: 500 });
  }
}
