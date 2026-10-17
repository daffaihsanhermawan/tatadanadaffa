import { NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Admin Approvals List API
 * GET /api/admin/approvals
 */
export async function GET() {
  const approvals = Array.from(inMemoryStore.pendingRegistrations.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return NextResponse.json({
    ok: true,
    pendingRegistrations: approvals,
    pendingCount
  });
}
