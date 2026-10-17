'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText
} from 'lucide-react';
import { formatRupiah, formatWIBDateTime, formatWIBDateShort } from '@/lib/utils/timezone';
import { Transaction, ReportExport } from '@/types';
import { getCurrentUser } from '@/lib/auth/session';

export default function LaporanPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [exportHistory, setExportHistory] = useState<ReportExport[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedWallet, setSelectedWallet] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category' | 'wallet'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Expanded Receipt items
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const onAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('tatadana_auth_change', onAuth);
    return () => window.removeEventListener('tatadana_auth_change', onAuth);
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedWallet, selectedType, searchQuery, startDate, endDate, currentUser]);

  useEffect(() => {
    const handleTxUpdate = () => {
      fetchData();
    };
    window.addEventListener('transaction-updated', handleTxUpdate);
    return () => window.removeEventListener('transaction-updated', handleTxUpdate);
  }, [selectedCategory, selectedWallet, selectedType, searchQuery, startDate, endDate, currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const params = new URLSearchParams();
      params.set('userId', uid);
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedWallet !== 'all') params.set('wallet', selectedWallet);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (searchQuery) params.set('search', searchQuery);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const [tRes, cRes, wRes] = await Promise.all([
        fetch(`/api/data/transactions?${params.toString()}`),
        fetch('/api/data/categories'),
        fetch(`/api/data/wallets?userId=${uid}`)
      ]);

      const tData = await tRes.json();
      const cData = await cRes.json();
      const wData = await wRes.json();

      setTransactions(tData.transactions || []);
      setCategories(cData.categories || []);
      setWallets(wData.wallets || []);
    } catch (e) {
      console.error('Error fetching transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  // Quick Date Presets
  const setQuickDatePreset = (preset: 'today' | '7days' | 'month' | 'all') => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(`${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      setStartDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setEndDate(todayStr);
    } else {
      setStartDate('');
      setEndDate('');
    }
    setPage(1);
  };

  // Sort transactions
  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'date') {
      comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
    } else if (sortField === 'amount') {
      comparison = Number(a.amount) - Number(b.amount);
    } else if (sortField === 'category') {
      comparison = (a.category_name || '').localeCompare(b.category_name || '');
    } else if (sortField === 'wallet') {
      comparison = (a.wallet_name || '').localeCompare(b.wallet_name || '');
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = sortedTransactions.slice((page - 1) * pageSize, page * pageSize);

  // Summary Metrics
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0);
  const netCashflow = totalIncome - totalExpense;

  // Top 5 Categories
  const catMap: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const name = t.category_name || 'Lainnya';
    catMap[name] = (catMap[name] || 0) + Number(t.amount);
  });
  const topCategories = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Trigger on-demand export (PDF or Excel)
  const handleExport = async (format: 'pdf' | 'xlsx') => {
    setExportLoading(true);
    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          format,
          period: startDate && endDate ? `${startDate} s/d ${endDate}` : 'Semua Transaksi',
          startDate,
          endDate
        })
      });
      const data = await res.json();
      if (data.ok && data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        if (data.exportRecord) {
          setExportHistory(prev => [data.exportRecord, ...prev]);
        }
      } else {
        alert(data.message || 'Gagal generate laporan');
      }
    } catch {
      alert('Terjadi kesalahan saat mengekspor laporan.');
    } finally {
      setExportLoading(false);
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar plan={currentUser?.active_plan || 'starter'} userName={currentUser?.full_name || 'Pengguna TataDana'} />

      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-8 overflow-y-auto">
        {/* Header & Export Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              📊 Laporan & Analisis Transaksi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabel pencatatan lengkap dengan filter kustom, riwayat struk, dan ekspor instan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('pdf')}
              disabled={exportLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-brand transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              disabled={exportLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Ringkasan Laporan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pemasukan</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatRupiah(totalIncome)}</p>
            <span className="text-[11px] text-emerald-700 font-semibold">{transactions.filter(t => t.type === 'income').length} transaksi</span>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pengeluaran</p>
            <p className="text-2xl font-extrabold text-red-600 mt-1">{formatRupiah(totalExpense)}</p>
            <span className="text-[11px] text-red-700 font-semibold">{transactions.filter(t => t.type === 'expense').length} transaksi</span>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Cashflow</p>
            <p className={`text-2xl font-extrabold mt-1 ${netCashflow >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {netCashflow >= 0 ? '+ ' : ''}{formatRupiah(netCashflow)}
            </p>
            <span className="text-[11px] text-slate-500 font-semibold">Selisih Arus Kas</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari catatan / merchant..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-orange-500"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>

            {/* Wallet Filter */}
            <select
              value={selectedWallet}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-orange-500"
            >
              <option value="all">Semua Dompet</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.name}>
                  👛 {w.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-orange-500"
            >
              <option value="all">Semua Jenis</option>
              <option value="expense">Pengeluaran Saja</option>
              <option value="income">Pemasukan Saja</option>
              <option value="transfer">Transfer Antar Dompet</option>
            </select>

            {/* Clear Filter Button */}
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedWallet('all');
                setSelectedType('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Reset Filter
            </button>
          </div>

          {/* Row 2: Date Range Filter & Quick Presets */}
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>Rentang Tanggal:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  Hapus Tanggal
                </button>
              )}
            </div>

            {/* Quick Presets Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Preset:</span>
              <button
                onClick={() => setQuickDatePreset('today')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600"
              >
                Hari Ini
              </button>
              <button
                onClick={() => setQuickDatePreset('7days')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600"
              >
                7 Hari
              </button>
              <button
                onClick={() => setQuickDatePreset('month')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600"
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setQuickDatePreset('all')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600"
              >
                Semua
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table with Expandable Receipt Items */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                <tr>
                  <th
                    onClick={() => toggleSort('date')}
                    className="py-3.5 px-4 cursor-pointer hover:text-orange-600"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tanggal (WIB)</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('category')}
                    className="py-3.5 px-4 cursor-pointer hover:text-orange-600"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Kategori</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('wallet')}
                    className="py-3.5 px-4 cursor-pointer hover:text-orange-600"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Dompet</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Catatan / Merchant</th>
                  <th
                    onClick={() => toggleSort('amount')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:text-orange-600"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Nominal</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Tidak ada transaksi yang cocok dengan filter yang dipilih.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => {
                    const isExpanded = expandedTxId === tx.id;
                    const hasItems = tx.receipt_items && tx.receipt_items.length > 0;

                    return (
                      <React.Fragment key={tx.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                            {formatWIBDateTime(tx.transaction_date)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800">
                            <span className="inline-flex items-center gap-1.5">
                              <span>{tx.category_icon || '📁'}</span>
                              <span>{tx.category_name}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold">
                              {tx.wallet_name || 'Dompet'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">{tx.notes || '-'}</p>
                            {tx.merchant_name && (
                              <p className="text-[10px] text-slate-400">Toko: {tx.merchant_name}</p>
                            )}
                          </td>
                          <td className={`py-3.5 px-4 text-right whitespace-nowrap font-extrabold ${
                            tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                          }`}>
                            {tx.type === 'income' ? '+ ' : '- '}{formatRupiah(tx.amount)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {hasItems ? (
                              <button
                                onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>{tx.receipt_items!.length} item</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>

                        {/* Expandable Receipt Items Sub-table */}
                        {isExpanded && hasItems && (
                          <tr className="bg-orange-50/30">
                            <td colSpan={6} className="p-4">
                              <div className="bg-white p-4 rounded-2xl border border-orange-200/80 shadow-sm space-y-2">
                                <p className="font-bold text-xs text-orange-700 flex items-center gap-1.5">
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>Rincian Item Scan Foto Struk ({tx.merchant_name || 'Struk Kasir'})</span>
                                </p>
                                <div className="divide-y divide-slate-100">
                                  {tx.receipt_items!.map((it, idx) => (
                                    <div key={idx} className="py-2 flex justify-between text-xs">
                                      <span className="font-medium text-slate-800">• {it.item_name}</span>
                                      <span className="font-bold text-slate-900">{formatRupiah(it.price)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Menampilkan {sortedTransactions.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, sortedTransactions.length)} dari {sortedTransactions.length} transaksi
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1.5 font-bold text-orange-600 bg-orange-50 rounded-lg">
                Halaman {page} dari {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
