'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Repeat, 
  Plus, 
  CheckCircle2, 
  Wallet,
  Sparkles,
  Calendar
} from 'lucide-react';
import { formatRupiah, formatWIBDateShort, toWIBDateString } from '@/lib/utils/timezone';
import { getCurrentUser } from '@/lib/auth/session';

export default function TransactionsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [wallets, setWallets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [amount, setAmount] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [targetWalletId, setTargetWalletId] = useState('');
  const [transactionDate, setTransactionDate] = useState<string>(() => toWIBDateString());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const onAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('tatadana_auth_change', onAuth);
    return () => window.removeEventListener('tatadana_auth_change', onAuth);
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [currentUser]);

  const fetchMeta = async () => {
    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const [wRes, cRes] = await Promise.all([
        fetch(`/api/data/wallets?userId=${uid}`),
        fetch('/api/data/categories')
      ]);
      const wData = await wRes.json();
      const cData = await cRes.json();

      setWallets(wData.wallets || []);
      setCategories(cData.categories || []);

      if (wData.wallets && wData.wallets.length > 0) {
        const def = wData.wallets.find((w: any) => w.is_default) || wData.wallets[0];
        setSelectedWalletId(def.id);
      }
      if (cData.categories && cData.categories.length > 0) {
        setSelectedCategoryId(cData.categories[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const res = await fetch('/api/data/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          walletId: selectedWalletId,
          categoryId: activeTab === 'transfer' ? null : selectedCategoryId,
          type: activeTab,
          amount: Number(amount),
          transactionDate: transactionDate || toWIBDateString(),
          notes,
          transferToWalletId: activeTab === 'transfer' ? targetWalletId : null
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessMsg(`Transaksi ${activeTab} sebesar ${formatRupiah(Number(amount))} berhasil dicatat!`);
        setAmount('');
        setNotes('');
        setTransactionDate(toWIBDateString());
        fetchMeta(); // Refresh wallet balances
        window.dispatchEvent(new Event('transaction-updated'));
        window.dispatchEvent(new Event('wallet-updated'));
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan transaksi');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar plan={currentUser?.active_plan || 'starter'} userName={currentUser?.full_name || 'Pengguna TataDana'} />

      <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto space-y-8 overflow-y-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Catat Transaksi Manual
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tambah pemasukan, pengeluaran, atau transfer saldo antar dompet langsung dari dashboard.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold">
          <button
            onClick={() => setActiveTab('expense')}
            className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'expense'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>💸 Pengeluaran</span>
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>💰 Pemasukan</span>
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'transfer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>🔁 Transfer Dompet</span>
          </button>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nominal */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nominal (IDR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 font-bold text-slate-400 text-sm">
                  Rp
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Contoh: 50000"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
            </div>

            {/* Wallet Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {activeTab === 'transfer' ? 'Dari Dompet Asal' : 'Pilih Dompet'}
                </label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Saldo: {formatRupiah(w.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === 'transfer' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Ke Dompet Tujuan
                  </label>
                  <select
                    value={targetWalletId}
                    onChange={(e) => setTargetWalletId(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- Pilih Dompet Tujuan --</option>
                    {wallets.filter(w => w.id !== selectedWalletId).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} (Saldo: {formatRupiah(w.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Kategori
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                  >
                    {categories
                      .filter(c => activeTab === 'income' ? c.type === 'income' : c.type === 'expense')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Date & Notes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="transactionDate" className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    <span>Tanggal Transaksi</span>
                  </label>
                  {transactionDate !== toWIBDateString() ? (
                    <button
                      type="button"
                      onClick={() => setTransactionDate(toWIBDateString())}
                      className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Klik untuk kembali ke hari ini"
                    >
                      Reset ke Hari Ini ↺
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                      (Default: Hari Ini)
                    </span>
                  )}
                </div>
                <input
                  id="transactionDate"
                  type="date"
                  required
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Catatan Transaksi
                </label>
                <input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Makan siang geprek, bensin motor, dsb"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 placeholder:font-normal focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm rounded-xl shadow-brand hover:shadow-brand-lg transition-all"
            >
              {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
            </button>
          </form>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
