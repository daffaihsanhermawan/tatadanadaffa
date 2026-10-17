'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  CreditCard, 
  CalendarDays,
  BarChart3, 
  Target, 
  Wallet as WalletIcon, 
  Settings, 
  LogOut, 
  Sparkles,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { getCurrentUser, clearCurrentUser } from '@/lib/auth/session';
import { Profile } from '@/types';

interface SidebarProps {
  plan?: 'starter' | 'pro';
  userName?: string;
  avatarUrl?: string | null;
}

export default function Sidebar({ 
  plan = 'starter', 
  userName = 'Pengguna TataDana',
  avatarUrl = null 
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);

  useEffect(() => {
    setUser(getCurrentUser());
    const onAuthChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('tatadana_auth_change', onAuthChange);
    return () => window.removeEventListener('tatadana_auth_change', onAuthChange);
  }, []);

  const effectiveName = user?.full_name || userName;
  const effectivePlan = user?.active_plan || plan;
  const isSuperAdmin = user?.is_superadmin === true;
  const effectiveAvatar = user?.avatar_url !== undefined ? user?.avatar_url : avatarUrl;

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    clearCurrentUser();
    router.push('/auth/login');
  };

  const menuItems = [
    { label: 'Beranda', href: '/dashboard', icon: Home },
    { label: 'Transaksi', href: '/transactions', icon: CreditCard },
    { label: 'Kalender Keuangan', href: '/calendar', icon: CalendarDays },
    { label: 'Laporan', href: '/laporan', icon: BarChart3 },
    { label: 'Budget', href: '/budget', icon: Target },
    { label: 'Wallet', href: '/wallet', icon: WalletIcon },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between p-4 sticky top-0 h-screen select-none">
      <div>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 px-3 py-4 mb-4 group">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white font-extrabold shadow-brand group-hover:scale-105 transition-transform">
            TD
          </div>
          <div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">
              Tata<span className="text-orange-600">Dana</span>
            </span>
          </div>
        </Link>

        {/* Plan Badge Banner */}
        <div className="mx-2 mb-6 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Paket Kamu
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
              effectivePlan === 'pro' 
                ? 'bg-orange-600 text-white shadow-sm' 
                : 'bg-slate-200 text-slate-700'
            }`}>
              {effectivePlan === 'pro' ? '★ Pro' : 'Starter'}
            </span>
          </div>
          {effectivePlan === 'starter' && (
            <Link
              href="/settings"
              className="mt-2.5 flex items-center justify-between text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors pt-2 border-t border-orange-200/50"
            >
              <span>Upgrade ke Pro</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-brand'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Logout */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        {/* Only show Portal Superadmin link if current user is superadmin */}
        {isSuperAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200/60"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
            <span>Portal Superadmin</span>
          </Link>
        )}

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-700 font-bold text-sm overflow-hidden shrink-0">
              {effectiveAvatar ? (
                <img src={effectiveAvatar} alt={effectiveName} className="w-full h-full object-cover" />
              ) : (
                <span>{effectiveName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate max-w-[100px]" title={effectiveName}>
                {effectiveName}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {isSuperAdmin ? '🛡️ Superadmin' : effectivePlan === 'pro' ? 'Akun Pro' : 'Akun Member'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
