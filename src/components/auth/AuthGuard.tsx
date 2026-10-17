'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, LogIn, ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';

interface AuthGuardProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export default function AuthGuard({
  children,
  fallbackTitle = 'Akses Terbatas',
  fallbackMessage = 'Anda belum login, silahkan login terlebih dahulu'
}: AuthGuardProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setLoading(false);

    const handleAuthChange = () => {
      const updatedUser = getCurrentUser();
      setCurrentUser(updatedUser);
    };

    window.addEventListener('tatadana_auth_change', handleAuthChange);
    return () => window.removeEventListener('tatadana_auth_change', handleAuthChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Memverifikasi sesi login...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />
          
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {fallbackTitle}
            </h2>
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl">
              <p className="text-xs sm:text-sm font-semibold text-red-300">
                {fallbackMessage}
              </p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed pt-1">
              Untuk melindungi privasi transaksi dan saldo rekening Anda, Anda harus masuk ke akun TataDana Anda.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/auth/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm rounded-xl transition-all shadow-brand shadow-orange-600/20 hover:scale-[1.01]"
            >
              <LogIn className="w-4 h-4" />
              <span>Login Sekarang</span>
            </Link>

            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

          <p className="text-[11px] text-slate-400">
            Belum punya akun?{' '}
            <Link href="/auth/register" className="text-orange-400 hover:underline font-bold">
              Daftar akun baru
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
