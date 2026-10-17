'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Clock, 
  TrendingDown, 
  TrendingUp, 
  CheckCircle2, 
  X,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { formatRupiah, formatWIBDateTime } from '@/lib/utils/timezone';
import { getCurrentUser } from '@/lib/auth/session';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const WEEKDAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function FinancialCalendarPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1); // 1-indexed (1-12)
  const [calendarData, setCalendarData] = useState<any>({ summary: {}, dailyData: {} });
  const [loading, setLoading] = useState(false);

  // Selected date modal state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const onAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('tatadana_auth_change', onAuth);
    return () => window.removeEventListener('tatadana_auth_change', onAuth);
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchCalendarData();
    }
  }, [currentYear, currentMonth, currentUser]);

  const fetchCalendarData = async () => {
    const uid = currentUser?.id;
    if (!uid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/data/calendar?userId=${uid}&year=${currentYear}&month=${currentMonth}`);
      const data = await res.json();
      if (data.ok) {
        setCalendarData(data);
      }
    } catch (e) {
      console.error('Failed to load calendar data', e);
    } finally {
      setLoading(false);
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Calendar Grid Calculations
  // Days in month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  // First day of month: 0=Sunday, 1=Monday, etc.
  const firstDayWeekday = new Date(currentYear, currentMonth - 1, 1).getDay();
  // Monday-first offset: Mon=0, Tue=1, ..., Sun=6
  const startDayOffset = (firstDayWeekday + 6) % 7;

  // Days in previous month for leading padding
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  // Selected date data
  const selectedDayData = selectedDateStr && calendarData.dailyData ? calendarData.dailyData[selectedDateStr] : null;

  // Compact rupiah formatter for calendar cells
  const formatCompactRp = (num: number) => {
    if (num >= 1000000) {
      const val = (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1);
      return `Rp${val}jt`;
    }
    if (num >= 1000) {
      const val = (num / 1000).toFixed(num % 1000 === 0 ? 0 : 0);
      return `Rp${val}rb`;
    }
    return `Rp${num}`;
  };

  // Format date display for modal: e.g. "Sabtu, 17 Oktober 2026"
  const formatDateTitle = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `${days[dateObj.getDay()]}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
  };

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const summary = calendarData.summary || {};

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 font-sans">
        <Sidebar plan={currentUser?.active_plan || 'starter'} userName={currentUser?.full_name || 'Pengguna TataDana'} />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-brand">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Kalender Keuangan
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Catatan pengeluaran spesifik (merah) & pemasukan (hijau) per tanggal kalender.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation & Actions */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm p-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-xs sm:text-sm font-extrabold text-slate-800 min-w-[130px] text-center">
                  {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleJumpToToday}
                className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl shadow-sm transition-colors"
              >
                Hari Ini
              </button>

              <Link
                href="/transactions"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-brand transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Transaksi</span>
              </Link>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Pemasukan Bulan Ini */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Pemasukan Bulan Ini</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-600">
                +{formatRupiah(summary.monthlyTotalIncome || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Total arus kas masuk</p>
            </div>

            {/* Pengeluaran Bulan Ini */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Pengeluaran Bulan Ini</span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-rose-600">
                -{formatRupiah(summary.monthlyTotalExpense || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Total belanja & pos biaya</p>
            </div>

            {/* Net Cashflow */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Selisih Bersih (Net)</span>
                <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className={`text-xl sm:text-2xl font-black ${
                (summary.monthlyNet || 0) >= 0 ? 'text-slate-900' : 'text-rose-600'
              }`}>
                {(summary.monthlyNet || 0) >= 0 ? '+' : ''}{formatRupiah(summary.monthlyNet || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {(summary.monthlyNet || 0) >= 0 ? 'Arus kas surplus' : 'Arus kas defisit'}
              </p>
            </div>

            {/* Hari Terboros */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Hari Terboros</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">
                {summary.peakExpenseDay ? formatRupiah(summary.peakExpenseDay.amount) : 'Rp0'}
              </p>
              <p className="text-[11px] text-amber-600 font-semibold mt-1">
                {summary.peakExpenseDay ? `Tgl ${parseInt(summary.peakExpenseDay.date.slice(8, 10), 10)} ${MONTH_NAMES[currentMonth - 1]}` : 'Belum ada pengeluaran'}
              </p>
            </div>
          </div>

          {/* Legend Banner */}
          <div className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs">
            <span className="font-bold text-slate-700">Petunjuk Warna Kalender:</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="font-bold text-emerald-700">Hijau (+): Pemasukan</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="font-bold text-rose-700">Merah (-): Pengeluaran</span>
              </div>
              <div className="flex items-center gap-1.5 hidden sm:flex">
                <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
                <span className="font-bold text-orange-700">Border Oranye: Hari Ini</span>
              </div>
            </div>
          </div>

          {/* MAIN CALENDAR GRID */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-3 text-xs font-black uppercase text-slate-600 tracking-wider">
              {WEEKDAY_NAMES.map((day, idx) => (
                <div key={day} className={idx >= 5 ? 'text-orange-600' : ''}>
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {/* Previous Month Padding Cells */}
              {Array.from({ length: startDayOffset }).map((_, i) => {
                const dayNum = daysInPrevMonth - startDayOffset + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    className="min-h-[105px] sm:min-h-[120px] p-2 sm:p-2.5 bg-slate-50/50 text-slate-300 select-none flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold text-slate-300">{dayNum}</span>
                  </div>
                );
              })}

              {/* Current Month Active Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const monthStr = currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
                const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
                const isToday = dateKey === todayStr;

                const dayData = calendarData.dailyData ? calendarData.dailyData[dateKey] : null;
                const hasIncome = dayData && dayData.totalIncome > 0;
                const hasExpense = dayData && dayData.totalExpense > 0;
                const hasTx = dayData && dayData.transactions && dayData.transactions.length > 0;

                return (
                  <div
                    key={dateKey}
                    onClick={() => {
                      setSelectedDateStr(dateKey);
                      setModalOpen(true);
                    }}
                    className={`min-h-[105px] sm:min-h-[120px] p-2 sm:p-2.5 transition-all cursor-pointer flex flex-col justify-between group hover:bg-orange-50/50 ${
                      isToday 
                        ? 'bg-orange-50/40 ring-2 ring-inset ring-orange-500/80' 
                        : 'bg-white hover:shadow-inner'
                    }`}
                  >
                    {/* Date Number & Badge */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs sm:text-sm font-black ${
                        isToday 
                          ? 'w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-brand' 
                          : 'text-slate-800 group-hover:text-orange-600'
                      }`}>
                        {dayNum}
                      </span>

                      {isToday && (
                        <span className="hidden sm:inline-block text-[9px] font-black uppercase text-orange-600 tracking-wider">
                          Hari ini
                        </span>
                      )}
                    </div>

                    {/* Transaction Badges (Green Income & Red Expense) */}
                    <div className="space-y-1 my-1">
                      {hasIncome && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-black text-[10px] truncate flex items-center justify-between">
                          <span className="truncate">+{formatCompactRp(dayData.totalIncome)}</span>
                          <ArrowDownRight className="w-2.5 h-2.5 shrink-0 ml-0.5 text-emerald-600" />
                        </div>
                      )}

                      {hasExpense && (
                        <div className="px-1.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/80 font-black text-[10px] truncate flex items-center justify-between">
                          <span className="truncate">-{formatCompactRp(dayData.totalExpense)}</span>
                          <ArrowUpRight className="w-2.5 h-2.5 shrink-0 ml-0.5 text-rose-600" />
                        </div>
                      )}
                    </div>

                    {/* Transaction count footer */}
                    <div className="text-[10px] text-slate-400 font-medium truncate">
                      {hasTx ? (
                        <span className="text-slate-600 font-semibold group-hover:text-orange-600">
                          {dayData.transactions.length} transaksi →
                        </span>
                      ) : (
                        <span className="opacity-0 group-hover:opacity-100 text-slate-300">
                          + Catat
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Next Month Padding Cells */}
              {(() => {
                const totalRendered = startDayOffset + daysInMonth;
                const nextMonthPadding = (7 - (totalRendered % 7)) % 7;
                return Array.from({ length: nextMonthPadding }).map((_, i) => (
                  <div
                    key={`next-${i}`}
                    className="min-h-[105px] sm:min-h-[120px] p-2 sm:p-2.5 bg-slate-50/50 text-slate-300 select-none flex flex-col justify-between"
                  >
                    <span className="text-xs font-bold text-slate-300">{i + 1}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL: DETAIL TRANSAKSI SPESIFIK PER TANGGAL */}
      {modalOpen && selectedDateStr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {formatDateTitle(selectedDateStr)}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Catatan spesifik arus kas & mutasi pada tanggal ini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center font-bold transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Daily Mini Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-800 uppercase">Pemasukan Tanggal Ini</p>
                <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                  +{formatRupiah(selectedDayData?.totalIncome || 0)}
                </p>
              </div>
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl">
                <p className="text-[10px] font-bold text-rose-800 uppercase">Pengeluaran Tanggal Ini</p>
                <p className="text-base font-extrabold text-rose-600 mt-0.5">
                  -{formatRupiah(selectedDayData?.totalExpense || 0)}
                </p>
              </div>
            </div>

            {/* Transaction List on this day */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Daftar Transaksi ({selectedDayData?.transactions?.length || 0})
              </h4>

              {(!selectedDayData || !selectedDayData.transactions || selectedDayData.transactions.length === 0) ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <p className="text-xs text-slate-400 font-medium">
                    Belum ada transaksi yang dicatat pada tanggal ini.
                  </p>
                  <Link
                    href="/transactions"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white font-bold text-xs rounded-xl shadow-brand hover:bg-orange-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Transaksi Sekarang</span>
                  </Link>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {selectedDayData.transactions.map((tx: any) => {
                    const isIncome = tx.type === 'income';
                    return (
                      <div
                        key={tx.id}
                        className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isIncome 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.category_icon || (isIncome ? '💰' : '💸')}
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">
                              {tx.notes || tx.category_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {tx.wallet_name || 'Dompet'} • {formatWIBDateTime(tx.transaction_date).split(',')[1] || ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-xs font-black ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {isIncome ? '+' : '-'}{formatRupiah(tx.amount)}
                          </p>
                          <span className="text-[9px] uppercase font-bold text-slate-400">
                            {tx.source || 'web'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Link
                href="/transactions"
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-1.5 text-center"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Transaksi Baru</span>
              </Link>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
