import { NextRequest, NextResponse } from 'next/server';
import { inMemoryStore } from '@/lib/supabase/db-service';
import { PendingRegistration } from '@/types';

/**
 * WhatsApp Registration Request API
 * POST /api/auth/register-request
 * 
 * Creates a pending registration and returns a WhatsApp confirmation link to Admin 089531331333
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = (body.fullName || body.name || '').trim();
    const phone = (body.phoneNumber || body.phone || '').trim().replace(/^\+62/, '0');
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (!fullName) {
      return NextResponse.json({ ok: false, message: 'Nama lengkap wajib diisi.' }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json({ ok: false, message: 'Nomor WhatsApp / HP wajib diisi.' }, { status: 400 });
    }

    // Check if phone or email already registered in active profiles
    for (const [, p] of Array.from(inMemoryStore.profiles.entries())) {
      const pPhone = (p.phone_number || '').replace(/^\+62/, '0');
      const pEmail = (p.email || '').toLowerCase();
      if (pPhone && (pPhone === phone || pPhone === phone.replace(/^0/, '62'))) {
        return NextResponse.json({ 
          ok: false, 
          message: 'Nomor HP sudah terdaftar. Silakan langsung login.' 
        }, { status: 400 });
      }
      if (email && pEmail === email) {
        return NextResponse.json({ 
          ok: false, 
          message: 'Email sudah terdaftar. Silakan langsung login.' 
        }, { status: 400 });
      }
    }

    // Format WhatsApp message to Admin 089531331333
    const waText = 
      `Halo Admin TataDana, saya ingin konfirmasi pendaftaran akun baru:\n\n` +
      `• Nama: ${fullName}\n` +
      `• No. WhatsApp: ${phone}\n` +
      (email ? `• Email: ${email}\n` : '') +
      `\nMohon persetujuannya untuk mengaktifkan akun saya di TataDana. Terima kasih!`;

    const encodedText = encodeURIComponent(waText);
    const whatsappUrl = `https://wa.me/6289531331333?text=${encodedText}`;

    const regId = `reg-${Date.now()}`;
    const newPending: PendingRegistration = {
      id: regId,
      full_name: fullName,
      email: email || undefined,
      phone_number: phone,
      password: password || undefined,
      status: 'pending',
      whatsapp_url: whatsappUrl,
      created_at: new Date().toISOString()
    };

    inMemoryStore.pendingRegistrations.set(regId, newPending);

    // Also record admin audit log
    inMemoryStore.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      admin_id: 'system',
      action: 'NEW_REGISTRATION_REQUEST',
      target_user_id: regId,
      target_user_name: fullName,
      details: {
        phone_number: phone,
        email,
        whatsapp_target: '089531331333',
        status: 'pending',
        timestamp: new Date().toISOString()
      },
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      ok: true,
      registrationId: regId,
      whatsappUrl,
      message: 'Pendaftaran berhasil dikirim. Silakan kirim konfirmasi via WhatsApp ke Admin.',
      pendingRegistration: newPending
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  const list = Array.from(inMemoryStore.pendingRegistrations.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json({ ok: true, pendingRegistrations: list });
}
