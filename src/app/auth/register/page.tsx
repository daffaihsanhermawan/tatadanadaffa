'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Lock, Mail, Smartphone, User, CheckCircle2, MessageCircle, ExternalLink, Clock } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'form' | 'submitted'>('form');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      setErrorMsg('Nama lengkap dan nomor WhatsApp wajib diisi.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/register-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, email, password })
      });
      const data = await res.json();
      if (data.ok) {
        setWhatsappUrl(data.whatsappUrl);
        setStep('submitted');
        // Automatically open WhatsApp in new tab
        if (typeof window !== 'undefined' && data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank');
        }
      } else {
        setErrorMsg(data.message || 'Gagal mengirim pendaftaran.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center font-black text-white text-xl shadow-brand group-hover:scale-105 transition-transform">
            T
          </div>
          <span className="font-extrabold text-2xl text-white tracking-tight">
            Tata<span className="text-orange-500">Dana</span>
          </span>
        </Link>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl relative">
          
          {step === 'form' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-black text-white">Daftar Akun Baru</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pendaftaran akun member memerlukan verifikasi & persetujuan langsung dari Admin via WhatsApp.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Wildan Maulana"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="081234567890"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Nomor ini akan digunakan Admin untuk konfirmasi aktivasi akun Anda.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Email (Opsional)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@email.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Alur Verifikasi Pendaftaran:</span>
                  </p>
                  <p className="leading-relaxed text-[10px]">
                    Setelah klik tombol di bawah, Anda akan otomatis diarahkan ke chat WhatsApp Admin (<strong>089531331333</strong>) untuk verifikasi.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-brand transition-all disabled:opacity-50 mt-2"
                >
                  <span>{loading ? 'Memproses...' : 'Daftar & Minta Approval Admin'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-400">
                Sudah punya akun?{' '}
                <Link href="/auth/login" className="text-orange-400 font-bold hover:underline">
                  Masuk di sini
                </Link>
              </div>
            </div>
          )}

          {step === 'submitted' && (
            <div className="text-center space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  Terimakasih, Pendaftaran Anda Sedang Diproses
                </h3>
                <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                  <p className="text-xs sm:text-sm font-semibold text-emerald-300">
                    Silahkan menunggu respon dari Admin.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-left text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-700">
                  <span>Nama Pendaftar</span>
                  <span className="font-bold text-white">{fullName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-700">
                  <span>Nomor Kontak</span>
                  <span className="font-bold text-white font-mono">{phone}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-700">
                  <span>Nomor WhatsApp Admin</span>
                  <span className="font-bold text-emerald-400 font-mono">089531331333</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 pt-1">
                  <span>Status Akun</span>
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-bold uppercase">
                    <Clock className="w-3 h-3" />
                    Menunggu Approval Admin
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Kami telah membuka WhatsApp untuk mengirim konfirmasi. Jika chat belum terbuka otomatis, klik tombol di bawah:
              </p>

              <div className="flex flex-col gap-2.5 pt-1">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Kirim Chat WhatsApp ke Admin (089531331333)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <Link
                  href="/auth/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors"
                >
                  <span>Sudah Disetujui? Masuk ke Halaman Login</span>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
