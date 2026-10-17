'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { 
  Target, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { formatRupiah, getCurrentMonthKeyWIB } from '@/lib/utils/timezone';
import { Budget, Category } from '@/types';
import { getCurrentUser } from '@/lib/auth/session';

export default function BudgetPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    const onAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('tatadana_auth_change', onAuth);
    return () => window.removeEventListener('tatadana_auth_change', onAuth);
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [currentUser]);

  useEffect(() => {
    const onUpdate = () => fetchBudgets();
    window.addEventListener('transaction-updated', onUpdate);
    return () => window.removeEventListener('transaction-updated', onUpdate);
  }, [currentUser]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/data/budgets?userId=${uid}`),
        fetch('/api/data/categories')
      ]);
      const bData = await bRes.json();
      const cData = await cRes.json();

      setBudgets(bData.budgets || []);
      const expenseCats = (cData.categories || []).filter((c: any) => c.type === 'expense');
      setCategories(expenseCats);
      if (expenseCats.length > 0) {
        setNewCategoryId(expenseCats[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLimit || Number(newLimit) <= 0) {
      setErrorMsg('Masukkan nominal batas budget yang valid.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const res = await fetch('/api/data/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          categoryId: newCategoryId,
          monthlyLimit: Number(newLimit)
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessMsg('Budget kategori berhasil disimpan!');
        setNewLimit('');
        fetchBudgets();
      } else {
        setErrorMsg(data.message || 'Gagal menyimpan budget');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    }
  };

  const totalBudget = budgets.reduce((s, b) => s + Number(b.monthly_limit), 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent_amount || 0), 0);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar plan={currentUser?.active_plan || 'starter'} userName={currentUser?.full_name || 'Pengguna TataDana'} />

      <main className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              🎯 Budget & Pos Pengeluaran
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kendalikan batas biaya bulanan per kategori dengan indikator visual dan bot alert otomatis.
            </p>
          </div>

          <div className="text-xs font-semibold px-3 py-1.5 bg-orange-100 text-orange-800 rounded-xl">
            Bulan: {getCurrentMonthKeyWIB()}
          </div>
        </div>

        {/* Overview Budget Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Alokasi Budget</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{formatRupiah(totalBudget)}</p>
            <span className="text-[11px] text-slate-500">{budgets.length} pos anggaran aktif</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Terpakai</p>
            <p className="text-2xl font-extrabold text-orange-600 mt-1">{formatRupiah(totalSpent)}</p>
            <span className="text-[11px] text-orange-700 font-semibold">
              {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}% terpakai
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sisa Budget Aman</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{formatRupiah(Math.max(0, totalBudget - totalSpent))}</p>
            <span className="text-[11px] text-emerald-700 font-semibold">Tersisa untuk sisa bulan</span>
          </div>
        </div>

        {/* Form Add / Update Budget */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">
            Atur / Perbarui Budget Kategori
          </h3>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAddBudget} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Kategori
              </label>
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Batas Bulanan (IDR)
              </label>
              <input
                type="number"
                min="10000"
                step="10000"
                required
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="Misal: 1500000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Budget</span>
            </button>
          </form>
        </div>

        {/* Budgets List with Visual Bars */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-extrabold text-base text-slate-900">
              Daftar Realisasi Budget Kategori
            </h3>
            <span className="text-xs text-slate-400">
              Alert 80% & 100% otomatis dikirim via Telegram
            </span>
          </div>

          <div className="space-y-5">
            {budgets.map((b) => {
              const spent = b.spent_amount || 0;
              const limit = b.monthly_limit || 1;
              const pct = Math.round((spent / limit) * 100);
              const isOver = pct >= 100;
              const isWarning = pct >= 80 && pct < 100;

              return (
                <div key={b.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{b.category_icon || '📁'}</span>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{b.category_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {formatRupiah(spent)} terpakai dari batas {formatRupiah(limit)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2.5 py-1 rounded-full font-extrabold text-[11px] ${
                        isOver
                          ? 'bg-red-100 text-red-700'
                          : isWarning
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {pct}% {isOver ? '• Habis!' : isWarning ? '• Waspada' : '• Aman'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Sisa: {formatRupiah(Math.max(0, limit - spent))}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar Visual */}
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver
                          ? 'bg-red-500'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
