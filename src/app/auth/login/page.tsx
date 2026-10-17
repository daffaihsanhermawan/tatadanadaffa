'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Lock, Mail, Smartphone, CheckCircle2, ShieldCheck } from 'lucide-react';
import { setCurrentUser } from '@/lib/auth/session';

export default function LoginPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Login with Email or Name or Username
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Masukkan Email, Username, atau Nama Anda.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrNameOrPhone: email, password })
      });
      const data = await res.json();
      if (data.ok && data.user) {
        setCurrentUser(data.user);
        if (data.user.is_superadmin) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setErrorMsg(data.message || 'Gagal masuk akun.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone OTP Send
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setErrorMsg('Masukkan nomor WhatsApp / HP Anda.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phoneNumber: phone })
      });
      const data = await res.json();
      if (data.ok) {
        setOtpSent(true);
        setSuccessMsg(data.message);
      } else {
        setErrorMsg(data.message || 'Gagal mengirim OTP.');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Phone OTP Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      setErrorMsg('Masukkan 6 digit kode OTP.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phoneNumber: phone, otpCode })
      });
      const data = await res.json();
      if (data.ok) {
        if (data.user) {
          setCurrentUser(data.user);
        }
        if (data.user?.is_superadmin) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setErrorMsg(data.message || 'Kode OTP tidak valid.');
      }
    } catch {
      setErrorMsg('Gagal memverifikasi OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* Kiri (40%): Branding Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-orange-600 font-black text-2xl shadow-md">
              TD
            </div>
            <span className="font-extrabold text-3xl tracking-tight text-white">
              Tata<span className="text-orange-200">Dana</span>
            </span>
          </Link>

          <div className="mt-20 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold text-orange-100">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Platform Manajemen Finansial Modern</span>
            </div>
            <h2 className="text-4xl font-black leading-tight">
              Keuanganmu.<br />Terkontrol.
            </h2>
            <p className="text-orange-100 text-sm leading-relaxed max-w-sm pt-2">
              Satu akun terintegrasi penuh ke Telegram Bot, multi-dompet, dan analisis kecerdasan finansial otomatis.
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-3 pt-8 border-t border-white/20 text-xs text-orange-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Koneksi aman ke Telegram Bot 1 klik</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Enkripsi AES-256 untuk semua data sensitif</span>
          </div>
          <p className="pt-2 text-[11px] text-orange-200">
            © {new Date().getFullYear()} TataDana. Seluruh Hak Cipta Dilindungi.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Kanan (60%): Form Area (Full screen on mobile) */}
      <div className="w-full lg:w-[60%] flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white font-extrabold text-lg">
                TD
              </div>
              <span className="font-extrabold text-xl text-slate-900">
                Tata<span className="text-orange-600">Dana</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Selamat Datang Kembali
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Masuk untuk mengelola keuangan dan memantau bot Telegram kamu.
            </p>
          </div>

          {/* Method Tabs */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => { setAuthMethod('email'); setErrorMsg(''); }}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                authMethod === 'email' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Email & Password
            </button>
            <button
              onClick={() => { setAuthMethod('phone'); setErrorMsg(''); }}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                authMethod === 'phone' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Nomor WhatsApp / OTP
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              {successMsg}
            </div>
          )}

          {/* Form Method: Email */}
          {authMethod === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-brand hover:shadow-brand-lg transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Form Method: Phone OTP */
            <div className="space-y-4">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nomor WhatsApp / Handphone
                    </label>
                    <div className="relative">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081234567890"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Nomor ini dipakai sebagai verifikasi identitas di Bot Telegram.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-brand transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Kode OTP 6-Digit
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-xs text-orange-600 hover:underline"
                      >
                        Ganti Nomor
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Contoh: 123456"
                      className="w-full text-center tracking-widest text-lg font-bold py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                    <p className="text-[11px] text-slate-400 text-center mt-1">
                      Kode demo aktif: <strong>123456</strong>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-brand transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Google OAuth Option */}
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>
          </div>

          {/* Bottom link to Register */}
          <p className="text-center text-xs text-slate-500">
            Belum punya akun?{' '}
            <Link href="/auth/register" className="font-bold text-orange-600 hover:underline">
              Daftar Gratis di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
