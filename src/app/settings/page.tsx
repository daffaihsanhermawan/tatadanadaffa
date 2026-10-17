'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/auth/AuthGuard';
import { 
  User, 
  Send, 
  Bell, 
  FolderTree, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  Plus,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  Camera
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { AVATAR_CATEGORIES, AVATAR_PRESETS } from '@/lib/constants/avatars';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'telegram' | 'reminder' | 'categories'>('telegram');

  // Profile Form
  const [fullName, setFullName] = useState('Pengguna TataDana');
  const [phoneNumber, setPhoneNumber] = useState('081234567890');
  const [currency, setCurrency] = useState('IDR');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [selectedAvatarCategory, setSelectedAvatarCategory] = useState<'men' | 'women' | 'cartoon' | 'mascot'>('men');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState<{ isError: boolean; message: string } | null>(null);

  // Telegram Bot Form
  const [botToken, setBotToken] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected');
  const [connectionMode, setConnectionMode] = useState<'polling' | 'webhook'>('polling');
  const [botUsername, setBotUsername] = useState('');
  const [statusMessage, setStatusMessage] = useState('Masukkan API Token bot dari @BotFather untuk menghubungkan.');
  const [testingLoading, setTestingLoading] = useState(false);
  const [pollStatus, setPollStatus] = useState<string>('');

  // Reminder Form
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderFreq, setReminderFreq] = useState<1 | 2>(1);
  const [time1, setTime1] = useState('08:00');
  const [time2, setTime2] = useState('20:00');

  // Categories Form
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('☕');
  const [newCatColor, setNewCatColor] = useState('#8B5CF6');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      if (user.full_name) setFullName(user.full_name);
      if (user.phone_number) setPhoneNumber(user.phone_number);
      if (user.avatar_url) setAvatarUrl(user.avatar_url);
    }
    const onAuth = () => {
      const u = getCurrentUser();
      if (u) {
        setCurrentUser(u);
        if (u.full_name) setFullName(u.full_name);
        if (u.phone_number) setPhoneNumber(u.phone_number);
        if (u.avatar_url) setAvatarUrl(u.avatar_url);
      }
    };
    window.addEventListener('tatadana_auth_change', onAuth);
    return () => window.removeEventListener('tatadana_auth_change', onAuth);
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchCategories();
      fetchTelegramSettings();
    }
  }, [currentUser]);

  // Background polling loop when connected in polling mode
  useEffect(() => {
    if (connectionStatus !== 'connected' || connectionMode !== 'polling') return;

    const uid = currentUser?.id;
    if (!uid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/telegram/poll?userId=${uid}`);
        const data = await res.json();
        if (data.ok && data.count > 0) {
          setPollStatus(`⚡ Memproses ${data.count} pesan baru dari Telegram (${new Date().toLocaleTimeString()} WIB)`);
        }
      } catch (e) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [connectionStatus, connectionMode, currentUser]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/data/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTelegramSettings = async () => {
    try {
      const activeUser = currentUser || getCurrentUser();
      const uid = activeUser?.id;
      if (!uid) {
        setBotToken('');
        setConnectionStatus('disconnected');
        setBotUsername('');
        return;
      }

      const cachedToken = typeof window !== 'undefined' ? localStorage.getItem(`tatadana_bot_token_${uid}`) : null;
      if (cachedToken && !cachedToken.includes('mock')) {
        setBotToken(cachedToken);
      } else {
        setBotToken('');
      }

      const res = await fetch(`/api/telegram/setup-bot?userId=${uid}`);
      const data = await res.json();
      if (data.ok) {
        const cleanToken = data.botToken && !data.botToken.includes('mock') ? data.botToken : '';
        setBotToken(cleanToken);
        if (cleanToken && data.status === 'connected') {
          setConnectionStatus('connected');
          setBotUsername(data.botUsername || '');
          setStatusMessage(data.message || `Bot @${data.botUsername} aktif.`);
          if (typeof window !== 'undefined') {
            localStorage.setItem(`tatadana_bot_token_${uid}`, cleanToken);
          }
        } else {
          setBotToken('');
          setConnectionStatus('disconnected');
          setBotUsername('');
          setStatusMessage('Masukkan API Token bot dari @BotFather untuk menghubungkan.');
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`tatadana_bot_token_${uid}`);
            localStorage.removeItem('tatadana_bot_token');
          }
        }
        if (data.mode) setConnectionMode(data.mode);
      }
    } catch (e) {
      console.error('Failed to fetch Telegram settings:', e);
    }
  };

  // Test Telegram Connection & Set Polling / Webhook
  const handleTestConnection = async () => {
    if (!botToken.trim()) {
      setStatusMessage('Masukkan token bot dari @BotFather terlebih dahulu.');
      setConnectionStatus('disconnected');
      return;
    }

    setTestingLoading(true);
    setConnectionStatus('testing');
    setStatusMessage('⏳ Memeriksa ke Telegram API...');

    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const res = await fetch('/api/telegram/setup-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          botToken: botToken.trim(),
          mode: connectionMode
        })
      });

      const data = await res.json();
      if (data.ok) {
        setConnectionStatus('connected');
        setBotUsername(data.botUsername || 'TataDanaBot');
        setStatusMessage(data.message || `🟢 Terhubung dengan bot @${data.botUsername}!`);
        if (typeof window !== 'undefined') {
          localStorage.setItem('tatadana_bot_token', botToken.trim());
          localStorage.setItem(`tatadana_bot_token_${uid}`, botToken.trim());
        }
      } else {
        setConnectionStatus('disconnected');
        setStatusMessage(`🔴 Tidak terhubung: ${data.message || 'Token tidak valid'}`);
      }
    } catch (err: any) {
      setConnectionStatus('disconnected');
      setStatusMessage(`🔴 Gagal koneksi: ${err?.message}`);
    } finally {
      setTestingLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const uid = currentUser?.id || 'user-demo-tatadana';
      const res = await fetch('/api/data/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          name: newCatName,
          icon: newCatIcon,
          color: newCatColor,
          type: newCatType
        })
      });
      const data = await res.json();
      if (data.ok) {
        setNewCatName('');
        fetchCategories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
      setProfileSaveStatus({ isError: true, message: 'Format file tidak didukung. Gunakan PNG, JPG, atau WebP.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileSaveStatus({ isError: true, message: 'Ukuran foto maksimal 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setProfileSaveStatus({ isError: false, message: 'Foto kustom dipilih! Klik Simpan Perubahan Profil.' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    setProfileSaveStatus({ isError: false, message: 'Foto dihapus. Menggunakan inisial nama.' });
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setProfileSaveStatus({ isError: true, message: 'Nama lengkap wajib diisi.' });
      return;
    }

    setSavingProfile(true);
    setProfileSaveStatus(null);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || 'user-demo-tatadana',
          fullName: fullName.trim(),
          avatarUrl: avatarUrl || null
        })
      });

      const data = await res.json();
      if (data.ok && (data.user || data.profile)) {
        const updated = data.user || data.profile;
        setCurrentUser(updated);
        localStorage.setItem('tatadana_session_user', JSON.stringify(updated));
        window.dispatchEvent(new Event('tatadana_auth_change'));
        setProfileSaveStatus({ isError: false, message: 'Profil dan foto berhasil diperbarui!' });
      } else {
        setProfileSaveStatus({ isError: true, message: data.message || 'Gagal menyimpan profil.' });
      }
    } catch (err: any) {
      setProfileSaveStatus({ isError: true, message: 'Terjadi kesalahan saat menyimpan profil.' });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar plan={currentUser?.active_plan || 'starter'} userName={fullName} avatarUrl={avatarUrl || currentUser?.avatar_url} />

      <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto space-y-8 overflow-y-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            ⚙️ Pengaturan Aplikasi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi profil, integrasi bot Telegram, frekuensi reminder, dan kategori kustom.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-bold">
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'telegram' ? 'bg-orange-600 text-white shadow-brand' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram Bot</span>
          </button>
          <button
            onClick={() => setActiveTab('reminder')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'reminder' ? 'bg-orange-600 text-white shadow-brand' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Reminder Harian</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'categories' ? 'bg-orange-600 text-white shadow-brand' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Kategori</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'profile' ? 'bg-orange-600 text-white shadow-brand' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profil</span>
          </button>
        </div>

        {/* TAB 1: TELEGRAM BOT */}
        {activeTab === 'telegram' && (
          <div className="space-y-6">
            {/* Connection Status Card */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Integrasi Bot</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-3 h-3 rounded-full ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-500 animate-pulse'
                      : connectionStatus === 'testing'
                      ? 'bg-amber-500 animate-spin'
                      : 'bg-red-500'
                  }`} />
                  <p className="font-extrabold text-slate-900 text-base">
                    {connectionStatus === 'connected' && '🟢 Terhubung'}
                    {connectionStatus === 'testing' && '⏳ Testing Koneksi & Webhook...'}
                    {connectionStatus === 'disconnected' && '🔴 Tidak Terhubung'}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-1">{statusMessage}</p>
              </div>

              {connectionStatus === 'connected' && (
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <span>Buka @{botUsername}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Token Input & Test Button */}
            <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="font-extrabold text-base text-slate-900">
                Setup Token Bot Telegram
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Telegram Bot API Token
                </label>
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Contoh: 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-orange-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Token disimpan aman di sistem lokal dan otomatis tersimpan saat halaman dimuat ulang.
                </p>
              </div>

              {/* Mode Selection */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Metode Penerimaan Pesan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectionMode('polling')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      connectionMode === 'polling'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <p className="text-xs flex items-center gap-1.5">
                      <span>⚡ Mode Polling (Lokal / No Ngrok)</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                      Paling stabil di localhost. Bot langsung membalas chat tanpa perlu URL publik.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConnectionMode('webhook')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      connectionMode === 'webhook'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-950 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <p className="text-xs flex items-center gap-1.5">
                      <span>🌐 Mode Webhook (Server Publik)</span>
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                      Menggunakan URL ngrok / domain deployment publik.
                    </p>
                  </button>
                </div>
              </div>

              {pollStatus && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pollStatus}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testingLoading}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-2"
                >
                  {testingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>⏳ Memeriksa ke Telegram API...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Simpan Token & Hubungkan Bot</span>
                    </>
                  )}
                </button>

                {connectionStatus === 'connected' && botUsername && (
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4 text-orange-400" />
                    <span>Buka Chat @{botUsername} di Telegram</span>
                  </a>
                )}
              </div>
            </div>

            {/* Step by Step Guide from @BotFather */}
            <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-3xl space-y-4">
              <div className="flex items-center gap-2 text-orange-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Panduan 3 Langkah Buat Bot Telegram</span>
              </div>
              <h3 className="text-xl font-bold">
                Cara Mendapatkan Token Bot dari @BotFather:
              </h3>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    Buka Telegram, cari akun resmi <strong>@BotFather</strong>, lalu klik <strong>/start</strong>.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    Ketik perintah <strong>/newbot</strong>, beri nama bot Anda (misal: "Budi Dana"), lalu pilih username yang berakhiran 'bot' (misal: "budi_tatadanabot").
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-orange-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    Salin (copy) token API yang diberikan @BotFather, tempel ke form di atas, lalu klik <strong>"Test Koneksi"</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REMINDER */}
        {activeTab === 'reminder' && (
          <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Pengingat Catat Keuangan Harian
                </h3>
                <p className="text-xs text-slate-400">
                  Kirim notifikasi otomatis lewat Telegram (maksimal 2x sehari sesuai kebijakan produk).
                </p>
              </div>

              {/* Toggle ON/OFF */}
              <button
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  reminderEnabled ? 'bg-orange-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    reminderEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {reminderEnabled && (
              <div className="space-y-6 pt-2">
                {/* Frekuensi 1x atau 2x */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                    Frekuensi Pengingat
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setReminderFreq(1)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                        reminderFreq === 1
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      1x Sehari
                    </button>
                    <button
                      type="button"
                      onClick={() => setReminderFreq(2)}
                      className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                        reminderFreq === 2
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      2x Sehari (Maksimal)
                    </button>
                  </div>
                </div>

                {/* Jam Reminder */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Waktu Reminder 1 (WIB)
                    </label>
                    <input
                      type="time"
                      value={time1}
                      onChange={(e) => setTime1(e.target.value)}
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {reminderFreq === 2 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Waktu Reminder 2 (WIB)
                      </label>
                      <input
                        type="time"
                        value={time2}
                        onChange={(e) => setTime2(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  )}
                </div>

                {/* Preview Pesan Reminder */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    Preview Pesan Notifikasi Bot di Telegram:
                  </p>
                  <p className="text-xs whitespace-pre-line font-mono text-slate-200 leading-relaxed">
                    ⏰ Reminder Keuangan!{'\n'}
                    Jangan lupa catat pengeluaran hari ini ya 📝{'\n'}
                    Pencatatan rutin = keuangan lebih terkontrol 💪{'\n'}
                    Ketik transaksimu sekarang!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900">
                + Tambah Kategori Kustom
              </h3>

              <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Emoji / Icon
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-full text-center px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nama Kategori
                  </label>
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Misal: Skincare & Gym"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jenis
                  </label>
                  <select
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </form>
            </div>

            {/* Existing Categories Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="text-xl">{c.icon}</span>
                    <span className="text-xs font-bold text-slate-800 truncate">{c.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    c.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {c.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Profil Pengguna & Foto Akun
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ubah foto profil, pilih avatar preset, dan perbarui data akun Anda. Perubahan langsung tersinkronisasi di Sidebar.
              </p>
            </div>

            {/* AVATAR & PHOTO EDITING SECTION */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-5">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Large Avatar Preview */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full ring-4 ring-orange-500/20 bg-orange-100 flex items-center justify-center text-orange-700 font-extrabold text-2xl shadow-md overflow-hidden shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                      />
                    ) : (
                      <span>
                        {(fullName || 'TD')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  {avatarUrl && (
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Controls & Actions */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-bold text-slate-700">Status Foto:</span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      {avatarUrl ? (avatarUrl.startsWith('data:') ? 'Foto Kustom Unggahan' : 'Preset Avatar') : 'Inisial Default'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    {/* Upload File Input */}
                    <label className="cursor-pointer px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah Foto</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    {/* Open Preset Gallery Button */}
                    <button
                      type="button"
                      onClick={() => setShowPresetModal(!showPresetModal)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                      <span>{showPresetModal ? 'Tutup Pilihan Avatar' : 'Pilih Avatar Preset'}</span>
                    </button>

                    {/* Reset to Initials */}
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset ke Inisial</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Format didukung: PNG, JPG, WebP. Maksimal ukuran file 2MB.
                  </p>
                </div>
              </div>

              {/* AVATAR PRESET GALLERY ACCORDION */}
              {showPresetModal && (
                <div className="pt-4 border-t border-slate-200 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Koleksi Avatar TataDana
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPresetModal(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Tutup ✕
                    </button>
                  </div>

                  {/* Preset Category Filter */}
                  <div className="flex flex-wrap gap-1.5">
                    {AVATAR_CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedAvatarCategory(cat.key as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedAvatarCategory === cat.key
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Preset Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {AVATAR_PRESETS.filter((p) => p.category === selectedAvatarCategory).map((preset) => {
                      const isSelected = avatarUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(preset.url);
                            setProfileSaveStatus({ isError: false, message: `Avatar "${preset.name}" dipilih! Klik Simpan Perubahan Profil.` });
                          }}
                          className={`p-2 rounded-2xl border transition-all text-center flex flex-col items-center gap-1.5 relative group ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50/60 ring-2 ring-orange-500/30'
                              : 'border-slate-200 bg-white hover:border-orange-300'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100">
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-700 truncate w-full">
                            {preset.name}
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-orange-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* FORM INPUTS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nomor HP Terverifikasi
                </label>
                <input
                  type="text"
                  disabled
                  value={phoneNumber}
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mata Uang Default
                </label>
                <input
                  type="text"
                  disabled
                  value="IDR (Rupiah Indonesia)"
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* SAVE ACTION */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center gap-2"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Perubahan Profil</span>
                  </>
                )}
              </button>

              {profileSaveStatus && (
                <span className={`text-xs font-semibold ${profileSaveStatus.isError ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {profileSaveStatus.message}
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
    </AuthGuard>
  );
}
