'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { 
  Wallet as WalletIcon, 
  Plus, 
  Star, 
  Trash2, 
  CheckCircle2, 
  ArrowRightLeft,
  Smartphone,
  Landmark,
  Banknote
} from 'lucide-react';
import { formatRupiah } from '@/lib/utils/timezone';
import { Wallet } from '@/types';
import { getCurrentUser } from '@/lib/auth/session';

export default function WalletPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletType, setNewWalletType] = useState<'bank' | 'ewallet' | 'cash'>('bank');
  const [newWalletBalance, setNewWalletBalance] = useState('');
  const [newWalletColor, setNewWalletColor] = useState('#00529C');
  const [isDefault, setIsDefault] = useState(false);
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
    fetchWallets();
  }, [currentUser]);

  useEffect(() => {
    const onUpdate = () => fetchWallets();
    window.addEventListener('wallet-updated', onUpdate);
    return () => window.removeEventListener('wallet-updated', onUpdate);
  }, [currentUser]);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const res = await fetch(`/api/data/wallets?userId=${uid}`);
      const data = await res.json();
      setWallets(data.wallets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWalletName) {
      setErrorMsg('Nama dompet wajib diisi.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const res = await fetch('/api/data/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          name: newWalletName,
          type: newWalletType,
          balance: Number(newWalletBalance) || 0,
          color: newWalletColor,
          isDefault
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessMsg(`Dompet "${newWalletName}" berhasil ditambahkan!`);
        setNewWalletName('');
        setNewWalletBalance('');
        setIsDefault(false);
        fetchWallets();
      } else {
        setErrorMsg(data.message || 'Gagal membuat dompet');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    }
  };

  const handleSetDefault = async (walletId: string) => {
    try {
      const res = await fetch('/api/data/wallets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          isDefault: true
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessMsg('Dompet default untuk transaksi Telegram berhasil diubah!');
        fetchWallets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    if (!confirm('Yakin ingin menghapus dompet ini?')) return;
    try {
      const res = await fetch(`/api/data/wallets?id=${walletId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        fetchWallets();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalBalance = wallets.reduce((s, w) => s + Number(w.balance), 0);

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar plan={currentUser?.active_plan || 'starter'} userName={currentUser?.full_name || 'Pengguna TataDana'} />

      <main className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              👛 Multi Wallet & Dompet Finansial
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola rekening bank, e-wallet, dan uang tunai. Tentukan 1 dompet default untuk Telegram.
            </p>
          </div>

          <div className="text-xs font-semibold px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700">
            Total Semua Dompet: <strong className="text-orange-600 font-extrabold">{formatRupiah(totalBalance)}</strong>
          </div>
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

        {/* Existing Wallets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {wallets.map((w) => (
            <div
              key={w.id}
              className={`p-6 rounded-3xl bg-white border-2 transition-all relative overflow-hidden flex flex-col justify-between ${
                w.is_default
                  ? 'border-orange-500 shadow-brand'
                  : 'border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              {w.is_default && (
                <div className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-white" />
                  <span>Default Telegram</span>
                </div>
              )}

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold shadow-sm"
                    style={{ backgroundColor: w.color || '#FF6B00' }}
                  >
                    {w.type === 'cash' ? <Banknote className="w-5 h-5" /> : w.type === 'ewallet' ? <Smartphone className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{w.name}</h3>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">{w.type}</p>
                  </div>
                </div>

                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatRupiah(w.balance)}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs mt-4">
                {!w.is_default ? (
                  <button
                    onClick={() => handleSetDefault(w.id)}
                    className="text-orange-600 font-bold hover:text-orange-700 hover:underline"
                  >
                    Set Jadi Default
                  </button>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung Telegram
                  </span>
                )}

                {wallets.length > 1 && (
                  <button
                    onClick={() => handleDeleteWallet(w.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg"
                    title="Hapus Dompet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Wallet Form */}
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900">
            + Tambah Dompet Baru
          </h3>

          <form onSubmit={handleCreateWallet} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Nama Dompet
              </label>
              <input
                type="text"
                required
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                placeholder="Misal: Mandiri Tabungan"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Jenis Dompet
              </label>
              <select
                value={newWalletType}
                onChange={(e) => setNewWalletType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500"
              >
                <option value="bank">Rekening Bank</option>
                <option value="ewallet">E-Wallet (GoPay/OVO/ShopeePay)</option>
                <option value="cash">Uang Tunai (Cash)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Saldo Awal (IDR)
              </label>
              <input
                type="number"
                value={newWalletBalance}
                onChange={(e) => setNewWalletBalance(e.target.value)}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan Dompet</span>
            </button>
          </form>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
