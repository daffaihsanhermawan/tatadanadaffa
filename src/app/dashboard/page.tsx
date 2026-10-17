'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Target, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Send, 
  CheckCircle2, 
  ChevronRight,
  Filter,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { formatRupiah, formatWIBDateShort } from '@/lib/utils/timezone';
import { getCurrentUser } from '@/lib/auth/session';

export default function DashboardOverviewPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [period, setPeriod] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan'>('bulanan');
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const onAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('tatadana_auth_change', onAuth);
    return () => window.removeEventListener('tatadana_auth_change', onAuth);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [period, currentUser]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('transaction-updated', handleUpdate);
    window.addEventListener('wallet-updated', handleUpdate);
    return () => {
      window.removeEventListener('transaction-updated', handleUpdate);
      window.removeEventListener('wallet-updated', handleUpdate);
    };
  }, [currentUser]);

  const fetchDashboardData = async () => {
    const uid = currentUser?.id;
    if (!uid) {
      setWallets([]);
      setTransactions([]);
      setBudgets([]);
      return;
    }
    setLoading(true);
    try {
      const [wRes, tRes, bRes] = await Promise.all([
        fetch(`/api/data/wallets?userId=${uid}`),
        fetch(`/api/data/transactions?userId=${uid}`),
        fetch(`/api/data/budgets?userId=${uid}`)
      ]);
      const wData = await wRes.json();
      const tData = await tRes.json();
      const bData = await bRes.json();

      setWallets(wData.wallets || []);
      setTransactions(tData.transactions || []);
      setBudgets(bData.budgets || []);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance), 0);
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalBudget = budgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
  const budgetRemaining = Math.max(0, totalBudget - totalExpense);

  // Pie chart data: Expenses by Category
  const categoryExpenseMap: Record<string, { name: string; amount: number; color: string }> = {};
  const colors = ['#FF6B00', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#F59E0B', '#06B6D4'];

  transactions.filter(t => t.type === 'expense').forEach((t, i) => {
    const cat = t.category_name || 'Lainnya';
    if (!categoryExpenseMap[cat]) {
      categoryExpenseMap[cat] = {
        name: cat,
        amount: 0,
        color: colors[Object.keys(categoryExpenseMap).length % colors.length]
      };
    }
    categoryExpenseMap[cat].amount += Number(t.amount);
  });
  const pieData = Object.values(categoryExpenseMap);

  // 6-Month Comparison Bar Chart
  const sixMonthsData = [
    { month: 'Mei', pemasukan: 11000000, pengeluaran: 4200000 },
    { month: 'Jun', pemasukan: 11500000, pengeluaran: 4800000 },
    { month: 'Jul', pemasukan: 12000000, pengeluaran: 5100000 },
    { month: 'Ags', pemasukan: 12000000, pengeluaran: 3900000 },
    { month: 'Sep', pemasukan: 12500000, pengeluaran: 4400000 },
    { month: 'Okt', pemasukan: totalIncome || 12500000, pengeluaran: totalExpense || 3200000 },
  ];

  // Daily Trend Line Data
  const dailyTrendData = [
    { day: '01', amount: 85000 },
    { day: '04', amount: 240000 },
    { day: '07', amount: 150000 },
    { day: '10', amount: 320000 },
    { day: '12', amount: 95000 },
    { day: '14', amount: 480000 },
    { day: '16', amount: 285000 },
  ];

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <Sidebar plan={currentUser?.active_plan || 'starter'} userName={currentUser?.full_name || 'Pengguna TataDana'} />

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto">
        {/* Top Header & Period Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Keuangan
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau arus kas, realisasi budget, dan transaksi Telegram kamu secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold">
              {(['harian', 'mingguan', 'bulanan', 'tahunan'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    period === p
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Quick action button to Calendar */}
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Kalender</span>
            </Link>

            <Link
              href="/transactions"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-brand transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>+ Transaksi</span>
            </Link>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Total */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Saldo Total</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{formatRupiah(totalBalance)}</p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>{wallets.length} dompet terhubung</span>
            </p>
          </div>

          {/* Card 2: Pemasukan Bulan Ini */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Pemasukan</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-emerald-600">{formatRupiah(totalIncome)}</p>
            <p className="text-[11px] text-emerald-600/90 font-medium mt-1">
              + Arus kas masuk bulan ini
            </p>
          </div>

          {/* Card 3: Pengeluaran Bulan Ini */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Pengeluaran</span>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-red-600">{formatRupiah(totalExpense)}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Total belanja & kebutuhan
            </p>
          </div>

          {/* Card 4: Budget Tersisa */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-200 transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Budget Tersisa</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{formatRupiah(budgetRemaining)}</p>
            <p className="text-[11px] text-orange-600 font-semibold mt-1">
              Dari alokasi {formatRupiah(totalBudget || 5000000)}
            </p>
          </div>
        </div>

        {/* Banner Quick Action: Kalender Keuangan */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-100/60 border border-orange-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-brand shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-orange-200/70 text-orange-800 px-2.5 py-0.5 rounded-full">
                  Fitur Baru
                </span>
                <span className="text-xs font-bold text-slate-500 hidden sm:inline">Kalender Keuangan</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-0.5">
                Lihat Pengeluaran & Pemasukan Harian di Kalender
              </h2>
              <p className="text-xs text-slate-600">
                Pantau cashflow harian tanggal per tanggal lengkap dengan visualisasi indikator pemasukan (hijau), pengeluaran (merah), dan rincian transaksi.
              </p>
            </div>
          </div>
          <Link
            href="/calendar"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-brand transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Buka Kalender</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bar Chart: Pemasukan vs Pengeluaran 6 Bulan (Cols 7) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Pemasukan vs Pengeluaran (6 Bulan Terakhir)
                </h3>
                <p className="text-xs text-slate-400">Tren komparasi cashflow bulanan</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Pemasukan
                </span>
                <span className="flex items-center gap-1.5 text-orange-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> Pengeluaran
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sixMonthsData}>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip formatter={(value: any) => formatRupiah(Number(value))} />
                  <Bar dataKey="pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pengeluaran" fill="#FF6B00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Pengeluaran per Kategori (Cols 5) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-base font-extrabold text-slate-900">
                Alokasi Pengeluaran per Kategori
              </h3>
              <p className="text-xs text-slate-400">Komposisi pos biaya bulan berjalan</p>
            </div>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: 'Belum ada data', amount: 1, color: '#CBD5E1' }]}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
              {pieData.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Trend Line */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Grafik Pengeluaran Harian Bulan Ini
              </h3>
              <p className="text-xs text-slate-400">Intensitas belanja harian dalam WIB</p>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
              Rata-rata: Rp185.000 / hari
            </span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendData}>
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(value: any) => formatRupiah(Number(value))} />
                <Line type="monotone" dataKey="amount" stroke="#FF6B00" strokeWidth={3} dot={{ fill: '#FF6B00', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 10 Recent Transactions & Onboarding Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List 10 Transaksi Terbaru (Cols 8) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  10 Transaksi Terbaru
                </h3>
                <p className="text-xs text-slate-400">Tersinkronisasi otomatis dari Telegram & Web</p>
              </div>
              <Link
                href="/laporan"
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                Lihat Semua Laporan
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/50 border border-slate-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-sm">
                      {tx.category_icon || (tx.type === 'income' ? '💰' : '💸')}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {tx.notes || tx.category_name || 'Transaksi'}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{formatWIBDateShort(tx.transaction_date)}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-500">{tx.wallet_name || 'Dompet'}</span>
                        {tx.source === 'telegram_photo' && (
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded">
                            Struk AI
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-extrabold ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {tx.type === 'income' ? '+ ' : '- '}
                      {formatRupiah(tx.amount)}
                    </p>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {tx.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Onboarding Checklist for Users (Cols 4) */}
          <div className="lg:col-span-4 bg-gradient-to-br from-orange-500 to-amber-500 text-white p-6 rounded-3xl shadow-brand-lg space-y-4">
            <div className="flex items-center gap-2 text-orange-100 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Panduan Memulai</span>
            </div>
            <h3 className="text-xl font-black leading-tight">
              3 Langkah Kendalikan Keuanganmu:
            </h3>

            <div className="space-y-3 pt-2 text-xs">
              <Link
                href="/settings"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between backdrop-blur-sm transition-all border border-white/20 block"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center font-bold text-[11px]">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold">1. Hubungkan Telegram Bot</p>
                    <p className="text-[10px] text-orange-100">Aktifkan webhook & getMe</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/wallet"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between backdrop-blur-sm transition-all border border-white/20 block"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-white text-orange-600 flex items-center justify-center font-bold text-[11px]">
                    2
                  </div>
                  <div>
                    <p className="font-bold">2. Atur Dompet / Saldo Awal</p>
                    <p className="text-[10px] text-orange-100">Set BCA / Cash default</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/budget"
                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-between backdrop-blur-sm transition-all border border-white/20 block"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-white text-orange-600 flex items-center justify-center font-bold text-[11px]">
                    3
                  </div>
                  <div>
                    <p className="font-bold">3. Set Budget Bulanan</p>
                    <p className="text-[10px] text-orange-100">Batas kategori pos biaya</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
