'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  Users, 
  Cpu, 
  Receipt, 
  Activity, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  ArrowLeft, 
  Search, 
  Lock, 
  ExternalLink, 
  Sparkles,
  Loader2,
  Crown,
  UserCheck,
  Clock,
  MessageCircle
} from 'lucide-react';
import { formatRupiah, formatWIBDateTime } from '@/lib/utils/timezone';
import { getCurrentUser, setCurrentUser as setSessionUser } from '@/lib/auth/session';

interface ToastState {
  show: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'providers' | 'logs' | 'payments' | 'audit'>('users');
  const [stats, setStats] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // User inspection modal
  const [inspectedUser, setInspectedUser] = useState<any | null>(null);
  const [inspectedTx, setInspectedTx] = useState<any[]>([]);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);

  // Role Switcher Loading state & Toast
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setAuthChecked(true);
    if (user?.is_superadmin) {
      fetchAdminOverview();
      fetchApprovals();
    }
  }, []);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const fetchAdminOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview?action=overview');
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats || {});
        setUsers(data.users || []);
        setAiProviders(data.aiProviders || []);
        setAiLogs(data.aiLogs || []);
        setSubscriptions(data.subscriptions || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/admin/approvals');
      const data = await res.json();
      if (data.ok) {
        setPendingApprovals(data.pendingRegistrations || []);
        setPendingCount(data.pendingCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Role & Plan Switcher Handler (Requirement 6)
  const handleUpdateRole = async (targetUserId: string, targetPlan: 'starter' | 'pro', targetIsSuperadmin?: boolean) => {
    setUpdatingUserId(targetUserId);
    try {
      const targetUser = users.find(u => u.id === targetUserId);
      const isSuperadminVal = targetIsSuperadmin !== undefined ? targetIsSuperadmin : targetUser?.is_superadmin;

      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          plan: targetPlan,
          is_superadmin: isSuperadminVal,
          adminId: currentUser?.id || 'user-admin-tatadana',
          reason: `Diubah dari Admin Portal oleh ${currentUser?.full_name || 'Superadmin'}`
        })
      });

      const data = await res.json();

      if (data.ok) {
        // Optimistic / Immediate State Update for instant UI badge switch
        setUsers(prev => prev.map(u => {
          if (u.id === targetUserId) {
            return {
              ...u,
              active_plan: targetPlan,
              is_superadmin: isSuperadminVal
            };
          }
          return u;
        }));

        // Dynamically adjust Stats card
        setStats((prev: any) => {
          const oldPlan = targetUser?.active_plan;
          let delta = 0;
          if (oldPlan !== 'pro' && targetPlan === 'pro') delta = 1;
          else if (oldPlan === 'pro' && targetPlan !== 'pro') delta = -1;
          return {
            ...prev,
            proUsers: Math.max(0, (prev.proUsers || 0) + delta)
          };
        });

        // Update session if modifying self
        if (currentUser?.id === targetUserId) {
          const updatedCurrent = {
            ...currentUser,
            active_plan: targetPlan,
            is_superadmin: isSuperadminVal
          };
          setCurrentUser(updatedCurrent);
          setSessionUser(updatedCurrent);
        }

        setToast({
          show: true,
          type: 'success',
          title: 'Role Berhasil Diperbarui',
          message: data.message || `Paket pengguna berhasil diubah ke ${targetPlan.toUpperCase()}.`
        });

        fetchAdminOverview();
      } else {
        setToast({
          show: true,
          type: 'error',
          title: 'Gagal Mengubah Role',
          message: data.message || 'Terjadi kesalahan saat mengubah role pengguna.'
        });
      }
    } catch (err: any) {
      setToast({
        show: true,
        type: 'error',
        title: 'Koneksi Bermasalah',
        message: err?.message || 'Tidak dapat menghubungi server.'
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Member Approval Action Handler (Requirement 8)
  const handleApprovalAction = async (registrationId: string, action: 'approve' | 'reject') => {
    setApprovingId(registrationId);
    try {
      const res = await fetch('/api/admin/approvals/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId,
          action,
          adminId: currentUser?.id || 'user-admin-tatadana',
          adminNotes: `Diproses oleh Superadmin ${currentUser?.full_name || 'Admin'}`
        })
      });
      const data = await res.json();

      if (data.ok) {
        setToast({
          show: true,
          type: 'success',
          title: action === 'approve' ? 'Member Disetujui' : 'Pendaftaran Ditolak',
          message: data.message
        });
        fetchApprovals();
        fetchAdminOverview();
      } else {
        setToast({
          show: true,
          type: 'error',
          title: 'Gagal Memproses Approval',
          message: data.message || 'Terjadi kesalahan saat memproses.'
        });
      }
    } catch (err: any) {
      setToast({
        show: true,
        type: 'error',
        title: 'Koneksi Bermasalah',
        message: err?.message || 'Gagal menghubungi server.'
      });
    } finally {
      setApprovingId(null);
    }
  };

  // Inspect User Transactions (With Audit Log)
  const handleInspectUser = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/admin/overview?action=inspect_user_transactions&targetUserId=${targetUserId}&adminId=${currentUser?.id || 'user-admin-tatadana'}`);
      const data = await res.json();
      if (data.ok) {
        setInspectedUser(data.targetUser);
        setInspectedTx(data.transactions || []);
        setInspectModalOpen(true);
        fetchAdminOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve / Reject Subscription Payment
  const handlePaymentDecision = async (subscriptionId: string, decision: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/payment/midtrans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_decision',
          subscriptionId,
          decision,
          adminNotes: `Diproses manual oleh superadmin pada ${new Date().toLocaleTimeString()}`
        })
      });
      const data = await res.json();
      if (data.ok) {
        setToast({
          show: true,
          type: 'success',
          title: 'Status Pembayaran Diperbarui',
          message: `Pembayaran berhasil di-${decision}.`
        });
        fetchAdminOverview();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Global Export Data
  const handleExportAll = async () => {
    try {
      const res = await fetch('/api/admin/overview?action=export_all_data');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data.exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TataDana_Platform_Backup_${Date.now()}.json`;
      a.click();
    } catch (e) {
      alert('Gagal mengekspor data.');
    }
  };

  // Restrict access for non-superadmin users
  if (authChecked && !currentUser?.is_superadmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Akses Ditolak (403)</h2>
            <p className="text-xs text-red-400 font-semibold mt-1">
              Halaman Khusus Superadmin TataDana
            </p>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Akun Anda <strong className="text-slate-200">({currentUser?.full_name || 'Member'})</strong> terdaftar sebagai pengguna reguler dan tidak memiliki izin akses ke Portal Superadmin.
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/dashboard"
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition-all shadow-md text-center"
            >
              Kembali ke Dashboard Member
            </Link>
            <Link
              href="/auth/login"
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition-all text-center"
            >
              Ganti Akun ke Superadmin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-6 sm:p-10 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Navbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-extrabold shadow-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                TataDana Superadmin Portal
              </h1>
              <p className="text-xs text-purple-300 font-medium">
                Kontrol role member, persetujuan pendaftaran WA, multi-provider AI & audit log
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              <span>Export All Data (JSON)</span>
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke App User</span>
            </Link>
          </div>
        </div>

        {/* 4 Superadmin Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Pengguna</p>
            <p className="text-2xl font-black text-white mt-1">{stats.totalUsers || users.length || 1}</p>
            <span className="text-[11px] text-purple-400 font-semibold">{stats.proUsers || 0} Akun Pro</span>
          </div>
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approval Member Pending</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</p>
            <span className="text-[11px] text-amber-300 font-semibold">WhatsApp 089531331333</span>
          </div>
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Transaksi</p>
            <p className="text-2xl font-black text-orange-400 mt-1">{stats.totalTransactions || 0}</p>
            <span className="text-[11px] text-slate-400">Web & Telegram</span>
          </div>
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Log Akses & Role</p>
            <p className="text-2xl font-black text-blue-400 mt-1">{auditLogs.length}</p>
            <span className="text-[11px] text-blue-300 font-semibold">Tercatat Otomatis</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-slate-800 rounded-2xl border border-slate-700 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'users' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manajemen User & Role</span>
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap relative ${
              activeTab === 'approvals' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Persetujuan Member Baru</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'providers' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Provider & Failover</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'payments' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Verifikasi Midtrans & Transfer</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'logs' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Log AI & Latensi</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'audit' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Audit Log</span>
          </button>
        </div>

        {/* TAB 1: USERS & ROLE SWITCHER (Requirement 6) */}
        {activeTab === 'users' && (
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Daftar Pengguna & Member Role Switcher</span>
                  <span className="text-[10px] bg-purple-900/60 text-purple-300 border border-purple-700/50 px-2 py-0.5 rounded-full font-mono">
                    {users.length} terdaftar
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ubah paket pengguna langsung ke Starter / Pro atau kelola hak akses Superadmin
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Nama Pengguna</th>
                    <th className="py-3.5 px-4">Kontak / HP</th>
                    <th className="py-3.5 px-4">Paket Aktif & Role Switcher</th>
                    <th className="py-3.5 px-4">Integrasi Telegram</th>
                    <th className="py-3.5 px-4 text-center">Aksi Support & Switcher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {users.map((u) => {
                    const isPro = u.active_plan === 'pro';
                    const isSuper = u.is_superadmin === true;
                    const isRowUpdating = updatingUserId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-700/30 transition-colors">
                        {/* User Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-purple-300">
                              {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{u.full_name}</span>
                                {isSuper && (
                                  <span className="inline-flex items-center gap-1 text-[9px] bg-purple-950 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                    <Crown className="w-2.5 h-2.5 text-amber-400" />
                                    SUPERADMIN
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{u.email || u.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Phone Number */}
                        <td className="py-3.5 px-4 font-mono text-slate-300">{u.phone_number || '-'}</td>

                        {/* Interactive Role / Plan Switcher Column (Requirement 6) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {/* Current Plan Badge */}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold uppercase text-[10px] shadow-sm transition-all ${
                              isPro 
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/20' 
                                : 'bg-slate-700 text-slate-300 border border-slate-600'
                            }`}>
                              {isPro && <Sparkles className="w-3 h-3 text-amber-200 animate-pulse" />}
                              {u.active_plan}
                            </span>

                            {/* Dropdown Role Selector */}
                            <div className="relative inline-block">
                              <select
                                value={isSuper ? 'superadmin' : u.active_plan}
                                disabled={isRowUpdating}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'superadmin') {
                                    handleUpdateRole(u.id, 'pro', true);
                                  } else {
                                    handleUpdateRole(u.id, val as 'starter' | 'pro', false);
                                  }
                                }}
                                className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-semibold rounded-lg px-2.5 py-1 cursor-pointer focus:outline-none focus:border-purple-500 disabled:opacity-50 transition-colors"
                              >
                                <option value="starter">Starter (Free)</option>
                                <option value="pro">Pro (Full Access)</option>
                                <option value="superadmin">Superadmin</option>
                              </select>
                            </div>

                            {isRowUpdating && (
                              <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                            )}
                          </div>
                        </td>

                        {/* Telegram Integration */}
                        <td className="py-3.5 px-4">
                          {u.telegramConnected ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                              🟢 Terhubung (@{u.telegramUsername || 'bot'})
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">🔴 Belum Terhubung</span>
                          )}
                        </td>

                        {/* Support & Quick Switcher Buttons */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Quick Upgrade/Downgrade Button */}
                            {isPro ? (
                              <button
                                disabled={isRowUpdating}
                                onClick={() => handleUpdateRole(u.id, 'starter', u.is_superadmin)}
                                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-amber-300 text-[11px] font-bold rounded-lg border border-slate-600 transition-colors disabled:opacity-50"
                                title="Kembalikan paket ke Starter"
                              >
                                Ke Starter
                              </button>
                            ) : (
                              <button
                                disabled={isRowUpdating}
                                onClick={() => handleUpdateRole(u.id, 'pro', u.is_superadmin)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-[11px] font-extrabold rounded-lg shadow-sm transition-all disabled:opacity-50"
                                title="Tingkatkan member langsung ke Pro"
                              >
                                <Sparkles className="w-3 h-3 text-amber-200" />
                                <span>Ubah ke Pro</span>
                              </button>
                            )}

                            {/* Impersonate */}
                            <Link
                              href="/dashboard"
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
                            >
                              Impersonate
                            </Link>

                            {/* View transactions with audit */}
                            <button
                              onClick={() => handleInspectUser(u.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors"
                            >
                              Lihat Transaksi
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PENDING APPROVALS (Requirement 8) */}
        {activeTab === 'approvals' && (
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 overflow-hidden shadow-xl space-y-4">
            <div className="p-5 border-b border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Persetujuan Member Baru (WhatsApp 089531331333)</span>
                  <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full font-mono">
                    {pendingCount} menunggu approval
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Setujui calon member baru yang telah mendaftar dan mengirim konfirmasi chat WhatsApp
                </p>
              </div>

              <button
                onClick={fetchApprovals}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-colors self-start sm:self-auto"
              >
                Muat Ulang Data
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Nama Calon Member</th>
                    <th className="py-3.5 px-4">Kontak / HP</th>
                    <th className="py-3.5 px-4">Waktu Daftar (WIB)</th>
                    <th className="py-3.5 px-4">Status Approval</th>
                    <th className="py-3.5 px-4 text-center">Aksi Keputusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-slate-200">
                  {pendingApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500">
                        Tidak ada pendaftaran member baru yang sedang menunggu approval.
                      </td>
                    </tr>
                  ) : (
                    pendingApprovals.map((p) => {
                      const isPending = p.status === 'pending';
                      const isApproved = p.status === 'approved';
                      const isRejected = p.status === 'rejected';
                      const isProcessing = approvingId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{p.full_name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{p.email || 'Tanpa Email'}</span>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <span>{p.phone_number}</span>
                              <a
                                href={p.whatsapp_url || `https://wa.me/${p.phone_number.replace(/^0/, '62')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300"
                                title="Chat WhatsApp Calon Member"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 font-mono">
                            {formatWIBDateTime(p.created_at)}
                          </td>

                          <td className="py-3.5 px-4">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold uppercase text-[10px] bg-amber-950 text-amber-300 border border-amber-700/60">
                                <Clock className="w-3 h-3 text-amber-400" />
                                Menunggu Approval
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold uppercase text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Disetujui
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold uppercase text-[10px] bg-red-950 text-red-300 border border-red-700/60">
                                <XCircle className="w-3 h-3 text-red-400" />
                                Ditolak
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isPending ? (
                                <>
                                  <button
                                    disabled={isProcessing}
                                    onClick={() => handleApprovalAction(p.id, 'approve')}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                                  >
                                    {isProcessing ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Setujui (Approve)</span>
                                  </button>

                                  <button
                                    disabled={isProcessing}
                                    onClick={() => handleApprovalAction(p.id, 'reject')}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-700 hover:bg-red-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-600 transition-all disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Tolak</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">
                                  {isApproved ? 'Akun aktif (Saldo Rp0)' : 'Pendaftaran ditolak'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: AI PROVIDER MANAGEMENT */}
        {activeTab === 'providers' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {aiProviders.map((prov) => (
              <div
                key={prov.id}
                className="p-6 rounded-3xl bg-slate-800 border border-slate-700 space-y-4 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      Prioritas {prov.priority}
                    </span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">
                      {prov.mode === 'failover' ? 'Paralel Failover' : 'Single'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white">{prov.display_name}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-1">Model: {prov.model_name}</p>

                  <div className="mt-4 p-3 bg-slate-900 rounded-xl text-xs text-slate-400 space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Status Kunci API</p>
                    <p className="text-emerald-400 font-mono text-[11px]">•••••••••••••••• (Terenkripsi AES)</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Mode: <strong>{prov.mode}</strong></span>
                  <button
                    onClick={() => alert(`Pengaturan ${prov.display_name} tersimpan!`)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-purple-600 text-white rounded-lg font-bold transition-colors"
                  >
                    Edit Token
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-700">
              <h3 className="font-bold text-sm text-white">Transaksi Pembayaran & Verifikasi Midtrans</h3>
              <p className="text-xs text-slate-400">Approve manual bukti transfer atau pantau webhook otomatis</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Paket</th>
                    <th className="py-3 px-4">Nominal</th>
                    <th className="py-3 px-4">Metode</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-200">
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500">
                        Belum ada pembayaran pending.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 px-4 font-mono">{s.midtrans_order_id || s.id}</td>
                        <td className="py-3 px-4 font-bold text-white">{s.user_name || s.user_id}</td>
                        <td className="py-3 px-4 uppercase font-bold text-orange-400">{s.plan}</td>
                        <td className="py-3 px-4 font-bold">{formatRupiah(s.amount)}</td>
                        <td className="py-3 px-4 uppercase">{s.payment_method}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                            s.status === 'active' ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center space-x-2">
                          {s.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handlePaymentDecision(s.id, 'approve')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handlePaymentDecision(s.id, 'reject')}
                                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-700">
              <h3 className="font-bold text-sm text-white">Audit Log Akses & Mutasi Role Pengguna</h3>
              <p className="text-xs text-slate-400">
                Pencatatan ketat inspeksi transaksi, approval member baru, dan perubahan hak akses demi akuntabilitas
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Waktu (WIB)</th>
                    <th className="py-3 px-4">Aksi Admin</th>
                    <th className="py-3 px-4">Target Pengguna</th>
                    <th className="py-3 px-4">Detail Mutasi / Inspeksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-300">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-slate-500">
                        Belum ada riwayat audit log.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((a) => (
                      <tr key={a.id}>
                        <td className="py-3 px-4 font-mono text-slate-400">{formatWIBDateTime(a.created_at)}</td>
                        <td className="py-3 px-4 font-bold text-purple-400">{a.action}</td>
                        <td className="py-3 px-4 text-white font-bold">{a.target_user_name || a.target_user_id}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{JSON.stringify(a.details)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: AI LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-lg">
            <div className="p-5 border-b border-slate-700">
              <h3 className="font-bold text-sm text-white">Log Pemanggilan Model AI (Monitoring Biaya & Latensi)</h3>
              <p className="text-xs text-slate-400">Mencatat model, fitur (text/photo/voice), latensi ms, dan status</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Fitur</th>
                    <th className="py-3 px-4">Latensi</th>
                    <th className="py-3 px-4">Estimasi Token</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 text-slate-300 font-mono">
                  {aiLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-500 font-sans">
                        Belum ada riwayat pemanggilan AI.
                      </td>
                    </tr>
                  ) : (
                    aiLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 px-4 font-bold text-white uppercase">{log.provider}</td>
                        <td className="py-3 px-4 text-purple-400">{log.feature}</td>
                        <td className="py-3 px-4">{log.latency_ms} ms</td>
                        <td className="py-3 px-4">{log.tokens_used} tokens</td>
                        <td className="py-3 px-4">
                          <span className="text-emerald-400 font-bold uppercase">{log.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-2xl border shadow-2xl flex items-start gap-3 backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-200' 
              : 'bg-slate-900/95 border-red-500/40 text-red-200'
          }`}>
            <div className="mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-xs text-white">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal User Inspection */}
      {inspectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-white">
                  Inspeksi Data Transaksi: {inspectedUser?.full_name}
                </h3>
                <p className="text-xs text-purple-400">
                  Aksi ini telah dicatat ke dalam audit log demi privasi
                </p>
              </div>
              <button
                onClick={() => setInspectModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {inspectedTx.map((t) => (
                <div key={t.id} className="p-3 bg-slate-900 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{t.notes || t.category_name}</p>
                    <p className="text-[10px] text-slate-400">{formatWIBDateTime(t.transaction_date)} • {t.wallet_name}</p>
                  </div>
                  <p className="font-bold text-orange-400">{formatRupiah(t.amount)}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setInspectModalOpen(false)}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Tutup Inspeksi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
