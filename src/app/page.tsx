'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getCurrentUser } from '@/lib/auth/session';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  MessageSquare, 
  Camera, 
  Mic, 
  FileSpreadsheet, 
  TrendingUp, 
  ShieldCheck, 
  HelpCircle, 
  ChevronDown, 
  Play, 
  Zap, 
  PieChart as PieIcon, 
  Lock,
  Wallet,
  Calendar,
  AlertTriangle,
  Smartphone
} from 'lucide-react';

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'lifetime'>('lifetime');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    const handleAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('tatadana_auth_change', handleAuth);
    return () => window.removeEventListener('tatadana_auth_change', handleAuth);
  }, []);

  // Interactive Telegram Chat Simulator State
  const [chatInput, setChatInput] = useState('beli bakso 15rb');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'user',
      text: 'beli bakso 15rb',
      time: '12:30'
    },
    {
      sender: 'bot',
      text: `📅 Kamis, 16 Oktober 2026 — 12:30 WIB
💸 Pengeluaran tercatat!
├ Nominal : Rp15.000
├ Kategori : 🍜 Makanan & Minuman
├ Dompet : 👛 BCA Utama
├ Catatan : beli bakso 15rb
└ Saldo : Rp14.735.000

📊 Budget Makanan & Minuman bulan ini:
[████░░░░░░] 47% — sisa Rp1.580.000
✨ Bagus! Pengeluaran masih dalam batas aman terkendali.`,
      time: '12:30'
    }
  ]);

  // Dynamic Live State for Landing Page Simulator & Dashboard Preview
  const [liveTotalBalance, setLiveTotalBalance] = useState(15505000);
  const [liveIncome, setLiveIncome] = useState(12500000);
  const [liveExpense, setLiveExpense] = useState(2950000);
  const [foodSpent, setFoodSpent] = useState(1420000);
  const [transportSpent, setTransportSpent] = useState(850000);
  const [hobbiesSpent, setHobbiesSpent] = useState(680000);

  const handleSimulateChat = async (presetText?: string) => {
    const textToSend = presetText || chatInput;
    if (!textToSend.trim()) return;

    setChatInput('');
    const userTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const newMsgs = [...chatMessages, { sender: 'user' as const, text: textToSend, time: userTime }];
    setChatMessages(newMsgs);

    try {
      const res = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend, userId: 'user-demo-tatadana' })
      });
      const data = await res.json();

      if (data.ok && data.reply) {
        setChatMessages(prev => [...prev, { 
          sender: 'bot' as const, 
          text: data.reply, 
          time: userTime 
        }]);

        if (data.parsed) {
          const nominal = Number(data.parsed.nominal) || 0;
          if (data.parsed.jenis === 'income' || data.parsed.jenis === 'pemasukan') {
            setLiveTotalBalance(prev => prev + nominal);
            setLiveIncome(prev => prev + nominal);
          } else {
            setLiveTotalBalance(prev => prev - nominal);
            setLiveExpense(prev => prev + nominal);
            if ((data.parsed.kategori || '').toLowerCase().includes('makan')) {
              setFoodSpent(prev => prev + nominal);
            } else if ((data.parsed.kategori || '').toLowerCase().includes('transport') || (data.parsed.kategori || '').toLowerCase().includes('bensin')) {
              setTransportSpent(prev => prev + nominal);
            } else {
              setHobbiesSpent(prev => prev + nominal);
            }
          }
        }
      } else {
        setChatMessages(prev => [...prev, { 
          sender: 'bot' as const, 
          text: data.message || 'Maaf, format transaksi tidak dikenali. Contoh: "beli bakso 15rb", "kopi 25k", "gajian 5jt"', 
          time: userTime 
        }]);
      }
    } catch {
      // Offline fallback: extract nominal
      let nominal = 15000;
      if (textToSend.includes('15rb') || textToSend.includes('15000')) nominal = 15000;
      else if (textToSend.includes('25k')) nominal = 25000;
      else if (textToSend.includes('5jt')) nominal = 5000000;

      const isInc = textToSend.includes('gaji') || textToSend.includes('5jt');
      if (isInc) {
        setLiveTotalBalance(prev => prev + nominal);
        setLiveIncome(prev => prev + nominal);
      } else {
        setLiveTotalBalance(prev => prev - nominal);
        setLiveExpense(prev => prev + nominal);
        setFoodSpent(prev => prev + nominal);
      }

      setChatMessages(prev => [...prev, { 
        sender: 'bot' as const, 
        text: `📅 ${new Date().toLocaleDateString('id-ID')} — ${userTime} WIB\n💸 Transaksi tercatat!\n├ Nominal : Rp${nominal.toLocaleString('id-ID')}\n├ Dompet : 👛 BCA Utama\n└ Saldo baru : Rp${(liveTotalBalance - nominal).toLocaleString('id-ID')}`, 
        time: userTime 
      }]);
    }
  };

  const faqs = [
    {
      q: 'Apakah bisa menggunakan fitur input foto struk di paket Starter?',
      a: 'Tidak. Fitur scan foto struk menggunakan AI Vision OCR hanya tersedia secara eksklusif untuk pelanggan paket Pro. Pada paket Starter, Anda tetap dapat mencatat dengan sangat praktis menggunakan teks natural dan voice note.'
    },
    {
      q: 'Bagaimana keamanan data transaksi saya di TataDana?',
      a: 'Keamanan adalah prioritas nomor 1 kami. Seluruh database transaksi disimpan di Supabase PostgreSQL dengan enkripsi tingkat militer dan Row Level Security (RLS). Token bot Telegram dan API key pihak ketiga disimpan dalam format terenkripsi AES-256.'
    },
    {
      q: 'Bagaimana cara menghubungkan Telegram bot ke akun TataDana saya?',
      a: 'Sangat mudah! Di halaman Pengaturan TataDana, masukkan nomor HP yang sama dengan yang terdaftar di akun Anda, ikuti panduan 3 langkah membuat bot di @BotFather, lalu tempel token bot Anda. Sistem otomatis memvalidasi dan mengaktifkan webhook.'
    },
    {
      q: 'Apakah TataDana mendukung pencatatan dalam mata uang Rupiah dan timezone WIB?',
      a: 'Ya, 100%! TataDana dibuat khusus untuk Indonesia. Seluruh nominal diformat dalam Rupiah (Rp) dan waktu pencatatan otomatis disinkronkan ke zona Waktu Indonesia Barat (WIB, Asia/Jakarta UTC+7).'
    },
    {
      q: 'Apakah format ekspor laporan PDF dan Excel bisa diunduh kapan saja?',
      a: 'Bagi pengguna paket Pro, Anda dapat mengekspor laporan keuangan on-demand untuk rentang tanggal kustom tanpa batas. Hasil ekspor tersimpan aman di Supabase Storage dan memiliki link unduh signed URL yang privat.'
    },
    {
      q: 'Apakah saya bisa mencatat transaksi lewat Voice Note (rekaman suara)?',
      a: 'Bisa! Anda cukup menekan tombol mic di Telegram dan bicara, misalnya "beli makan siang 20 ribu". TataDana akan mentranskripsikannya ke teks dengan Speech-to-Text lalu mencatatnya secara otomatis.'
    },
    {
      q: 'Apa perbedaan metode pembayaran Midtrans dan transfer manual?',
      a: 'Melalui Midtrans, akun Anda otomatis aktif seketika setelah pembayaran sukses (QRIS, GoPay, Virtual Account). Jika memilih transfer manual, Anda dapat mengunggah bukti transfer dan admin akan melakukan verifikasi manual dalam 1x24 jam.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Navbar */}
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-orange-50/50 via-white to-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            {/* 2. Pre-headline badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-100 border border-orange-200/80 text-orange-700 text-xs font-bold mb-6 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ Catat keuangan langsung dari Telegram</span>
            </div>

            {/* 3. Headline H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-4xl mx-auto">
              Gaji habis sebelum akhir bulan?{' '}
              <span className="gradient-text-orange block sm:inline">
                Sudah saatnya kamu tahu ke mana uangmu pergi.
              </span>
            </h1>

            {/* 4. Sub-headline */}
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              TataDana mencatat setiap pengeluaranmu langsung dari chat Telegram atau foto struk — sisanya kami yang urus.
            </p>

            {/* 6. CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              {currentUser ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-brand hover:shadow-brand-lg transition-all text-base"
                >
                  Masuk Dashboard
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-brand hover:shadow-brand-lg transition-all text-base"
                  >
                    Mulai Gratis Sekarang
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <a
                    href="#demo"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-all text-base"
                  >
                    Lihat cara kerjanya →
                  </a>
                </>
              )}
            </div>

            {/* 5. Hero Section Video Placeholder */}
            {/* // TODO: ganti dengan video asli demo TataDana */}
            <div className="mt-14 max-w-4xl mx-auto relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-900 group">
              <div className="aspect-video w-full flex flex-col items-center justify-center relative bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
                <div className="w-20 h-20 rounded-full bg-orange-600/90 flex items-center justify-center text-white shadow-brand-lg group-hover:scale-110 transition-transform cursor-pointer mb-4">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
                <p className="font-bold text-lg text-slate-100">Video Demo Interaktif TataDana</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md text-center">
                  Tonton bagaimana 1 pesan Telegram langsung menjadi catatan rapi dan grafik laporan real-time.
                </p>
                <span className="absolute bottom-4 right-4 text-[10px] bg-slate-800/80 px-2.5 py-1 rounded text-slate-400 border border-slate-700">
                  Placeholder Video (Siap diganti video produk)
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 7. PROBLEM-AWARE SECTION & 8. SOLUTION TRANSITION */}
        <section className="py-20 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">
                Realita Finansial Kita
              </h2>
              <p className="text-3xl font-extrabold text-slate-900">
                Kenapa mencatat pengeluaran rasanya selalu sulit?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Problem 1 */}
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all hover:shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-5 font-bold text-xl">
                  🤦‍♂️
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  "Buka aplikasi keuangan? Nanti dulu deh..."
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Aplikasi keuangan pada umumnya ribet: harus login, pilih akun, cari kategori, ketik manual. Baru 3 hari sudah malas dan ditinggal.
                </p>
              </div>

              {/* Problem 2 */}
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all hover:shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5 font-bold text-xl">
                  💸
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  "Kok uangnya habis ya? Padahal kayak tidak beli apa-apa"
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Jajan kopi 25rb, parkir 5rb, transfer admin 6.500... Pengeluaran kecil tak tercatat yang perlahan menguras separuh gajimu tanpa jejak.
                </p>
              </div>

              {/* Problem 3 */}
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-200 transition-all hover:shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5 font-bold text-xl">
                  📊
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  "Udah niat bikin budget, tapi seminggu lupa"
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Budget yang dibuat di awal bulan tidak pernah dipantau secara berkala. Tanpa notifikasi real-time, sama saja seperti tidak ada budget.
                </p>
              </div>
            </div>

            {/* 8. Solution transition */}
            <div className="mt-16 text-center max-w-2xl mx-auto p-8 rounded-3xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-brand-lg">
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-100 mb-1">
                Solusi Nyata
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold mb-3">
                Bagaimana kalau mencatat keuangan semudah kirim pesan ke teman?
              </h3>
              <p className="text-orange-50 text-sm leading-relaxed mb-5">
                Tidak perlu install aplikasi baru yang berat. Cukup kirim chat Telegram biasa, kirim foto struk belanja, atau kirim voice note.
              </p>
              <div className="inline-block bg-white text-orange-600 font-extrabold px-6 py-2.5 rounded-full text-sm shadow-md">
                ✨ Introducing TataDana
              </div>
            </div>
          </div>
        </section>

        {/* 9. INTERACTIVE DASHBOARD PREVIEW & TELEGRAM SIMULATOR */}
        <section id="demo" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">
                Simulasi Interaktif
              </h2>
              <p className="text-3xl font-extrabold text-slate-900">
                Coba langsung format chat bot Telegram TataDana
              </p>
              <p className="text-sm text-slate-600 mt-2">
                Ketik kalimat pengeluaran dalam bahasa Indonesia atau klik tombol cepat di bawah untuk melihat balasan bot yang asli!
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Telegram Phone Simulator (Cols 5) */}
              <div className="lg:col-span-5 bg-slate-900 p-4 rounded-[40px] shadow-2xl border-4 border-slate-800 max-w-md mx-auto w-full">
                {/* Phone Header */}
                <div className="bg-slate-800 rounded-t-3xl p-4 flex items-center justify-between text-white border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center font-bold text-sm">
                      TD
                    </div>
                    <div>
                      <p className="font-bold text-sm">TataDana Bot</p>
                      <p className="text-[10px] text-emerald-400 font-medium">bot • online</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300">
                    WIB
                  </span>
                </div>

                {/* Chat Bubble Area */}
                <div className="bg-[#0e1621] p-4 min-h-[360px] max-h-[420px] overflow-y-auto space-y-3 font-sans text-xs">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3.5 rounded-2xl whitespace-pre-line leading-relaxed shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-[#2b5278] text-white rounded-br-none'
                            : 'bg-[#182533] text-slate-100 rounded-bl-none border border-slate-700/60 font-mono text-[11px]'
                        }`}
                      >
                        {msg.text}
                        <span className="block text-[9px] text-slate-400 text-right mt-1.5 font-sans">
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info & Call to Action Bar (Only logged-in users have the AI popup) */}
                <div className="bg-slate-800 rounded-b-3xl p-4 text-center border-t border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-orange-400 font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fitur TataDana AI Assistant aktif setelah masuk akun</span>
                  </div>
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-xs rounded-xl shadow-brand transition-all hover:scale-[1.01]"
                  >
                    <span>Masuk Akun untuk Akses TataDana AI</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Interactive Dashboard Live Mock (Cols 7) */}
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900">
                      Live Preview Dashboard TataDana
                    </h3>
                    <p className="text-xs text-slate-500">
                      Data otomatis terupdate saat transaksi dicatat lewat Telegram
                    </p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100"
                  >
                    Buka Dashboard Asli
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* 4 Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 transition-all">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Saldo Total</p>
                    <p className="text-base font-extrabold text-slate-900 mt-1">
                      Rp{liveTotalBalance.toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-bold">3 Dompet Aktif</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 transition-all">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">Pemasukan</p>
                    <p className="text-base font-extrabold text-emerald-700 mt-1">
                      Rp{liveIncome.toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-semibold">+ Gaji Bulan Ini</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-red-50/60 border border-red-100 transition-all">
                    <p className="text-[10px] font-bold text-red-700 uppercase">Pengeluaran</p>
                    <p className="text-base font-extrabold text-red-700 mt-1">
                      Rp{liveExpense.toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] text-red-600 font-semibold">Tersinkron Real-time</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-100 transition-all">
                    <p className="text-[10px] font-bold text-orange-700 uppercase">Budget Sisa</p>
                    <p className="text-base font-extrabold text-orange-700 mt-1">
                      Rp{Math.max(0, 5000000 - liveExpense).toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] text-orange-600 font-semibold">Terkontrol</span>
                  </div>
                </div>

                {/* Visual Budget Bar */}
                <div className="space-y-3 pt-2">
                  <p className="text-xs font-bold text-slate-700">Status Alokasi Budget Kategori Bulan Ini:</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5">🍜 Makanan & Minuman</span>
                      <span className="text-slate-500">
                        Rp{foodSpent.toLocaleString('id-ID')} / Rp3.000.000 ({Math.min(100, Math.round((foodSpent / 3000000) * 100))}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((foodSpent / 3000000) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5">🚗 Transportasi</span>
                      <span className="text-slate-500">
                        Rp{transportSpent.toLocaleString('id-ID')} / Rp1.200.000 ({Math.min(100, Math.round((transportSpent / 1200000) * 100))}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((transportSpent / 1200000) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5">🎮 Hiburan & Hobi</span>
                      <span className="text-amber-600 font-bold">
                        Rp{hobbiesSpent.toLocaleString('id-ID')} / Rp800.000 ({Math.min(100, Math.round((hobbiesSpent / 800000) * 100))}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, Math.round((hobbiesSpent / 800000) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 10. FITUR SECTION (3 Alternating Layouts) */}
        <section id="fitur" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
            {/* Feature 1: Catat via Telegram (Teks, Foto, Voice Note) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                  Fitur Unggulan 01
                </span>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-4 leading-tight">
                  Catat Transaksi Semudah Kirim Chat WhatsApp atau Telegram
                </h3>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  Tidak ada lagi form berbelit-belit. Cukup ketik kalimat natural seperti "makan padang 25rb" atau "gajian 6jt". TataDana menggunakan Multi-Provider AI (Gemini, GPT, DeepSeek) untuk memproses teks, foto struk kasir, hingga voice note audio secara presisi.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700 font-medium">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Mengenali format nominal khas Indonesia: 15rb, 1.5jt, 500k, 25ribu</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Scan foto struk belanja otomatis rincikan nama barang dan harga (Pro)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Input suara voice note hingga 60 detik dengan transkrip otomatis</span>
                  </li>
                </ul>
              </div>
              <div className="p-8 rounded-3xl bg-gradient-to-tr from-orange-50 to-amber-50 border border-orange-200/60 shadow-lg">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <Camera className="w-6 h-6 text-orange-600" />
                    <div>
                      <p className="font-bold text-sm text-slate-900">AI Receipt Vision OCR</p>
                      <p className="text-xs text-slate-500">Membaca struk Supermarket & Restoran dalam 2 detik</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 font-mono text-slate-700 border border-slate-200/60">
                    <p className="font-bold text-slate-900">Merchant: Superindo Dago</p>
                    <p>• Minyak Goreng 2L : Rp34.000</p>
                    <p>• Beras Premium 5kg : Rp78.000</p>
                    <p>• Buah Apel Fuji : Rp42.000</p>
                    <p className="pt-1 font-bold text-orange-600 border-t border-slate-200">
                      Total: Rp154.000 (Otomatis Masuk Pos Belanja)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Laporan & Export Otomatis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center lg:flex-row-reverse">
              <div className="order-2 lg:order-1 p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-lg">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-sm text-slate-900">Laporan Bulanan Siap Unduh</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                      PDF & Excel (.xlsx)
                    </span>
                  </div>
                  <div className="text-xs space-y-2 text-slate-600">
                    <div className="flex justify-between">
                      <span>Total Pemasukan:</span>
                      <span className="font-bold text-emerald-600">Rp12.500.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Pengeluaran:</span>
                      <span className="font-bold text-red-600">Rp2.950.000</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                      <span>Net Cashflow:</span>
                      <span className="text-blue-600">+ Rp9.550.000</span>
                    </div>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <span className="w-1/2 text-center py-2 text-xs font-bold text-white bg-orange-600 rounded-lg shadow-sm">
                      Unduh PDF
                    </span>
                    <span className="w-1/2 text-center py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-lg">
                      Unduh Excel
                    </span>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <span className="text-xs font-bold px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                  Fitur Unggulan 02
                </span>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-4 leading-tight">
                  Laporan Lengkap & Ekspor Sekali Klik Tanpa Buka Spreadsheet Rumit
                </h3>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  Semua transaksi langsung tersinkronisasi ke database Supabase Anda secara real-time. Anda bisa memfilter berdasarkan dompet, kategori, atau rentang tanggal kustom, lalu menghasilkan file PDF atau Excel rapi yang siap dibagikan atau disimpan sebagai arsip.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700 font-medium">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Tabel transaksi interaktif dengan filter multi-dimensi & pencarian catatan</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Transaksi scan struk bisa di-expand melihat rincian item belanja</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Riwayat ekspor tersimpan dan dapat diunduh ulang tanpa batas</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3: AI Financial Advisor */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                  Fitur Unggulan 03
                </span>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-4 leading-tight">
                  AI Financial Advisor yang Menjaga Keuanganmu Tetap Sehat
                </h3>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  Bukan sekadar buku kas pasif. AI TataDana secara proaktif menganalisis pola transaksi Anda. Jika ada pos pengeluaran yang melonjak lebih dari 50% atau pengeluaran sudah memakan 80% dari gaji, Anda akan langsung mendapat peringatan dan saran konkret.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-700 font-medium">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Peringatan cerdas otomatis tanpa perlu memanggil perintah khusus</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Saran actionable yang realistis sesuai kebiasaan pengeluaran Anda</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <span>Reminder pengingat harian personal (maksimal 2x sehari sesuai jam pilihan)</span>
                  </li>
                </ul>
              </div>
              <div className="p-8 rounded-3xl bg-gradient-to-tr from-purple-50 to-orange-50 border border-purple-200/60 shadow-lg">
                <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                      🤖
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">AI Financial Advisor</p>
                      <p className="text-xs text-purple-600 font-semibold">Peringatan Pos Kopi & Nongkrong</p>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50/60 rounded-xl text-xs text-slate-700 leading-relaxed border border-purple-100">
                    <p className="font-semibold text-slate-900">
                      "Hei Budi! Pengeluaran kategori Nongkrong kamu minggu ini naik 65% dibanding minggu lalu (Rp450rb vs Rp270rb)."
                    </p>
                    <p className="mt-2 text-purple-900">
                      💡 <strong>Saran:</strong> Tahan ngopi di kafe untuk 3 hari ke depan, atau gunakan tumbler kopi sendiri untuk menghemat Rp150.000 sebelum akhir bulan!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 11. TESTIMONIALS (Masonry Grid with explicit TODO marker) */}
        {/* // TODO: ganti dengan testimoni asli setelah fase beta user selesai */}
        <section id="testimoni" className="py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">
                Cerita Komunitas
              </h2>
              <p className="text-3xl font-extrabold text-slate-900">
                Dipercaya oleh karyawan, freelancer, dan mahasiswa di seluruh Indonesia
              </p>
              <p className="text-xs text-slate-400 mt-2 italic">
                (Placeholder testimoni — akan diperbarui dengan kutipan pengguna beta tester)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Testi 1 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                    RA
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">Rizky Ananda</p>
                    <p className="text-xs text-slate-500">Software Engineer • Jakarta</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  "Dulu selalu malas buka aplikasi catatan keuangan karena langkahnya kepanjangan. Sekarang habis bayar QRIS langsung chat bot Telegram 'kopi 25rb'. Gampang banget, akhir bulan tabungan akhirnya bersisa!"
                </p>
                <div className="text-orange-500 text-sm">★★★★★</div>
              </div>

              {/* Testi 2 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    DS
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">Dina Safitri</p>
                    <p className="text-xs text-slate-500">Freelance Designer • Bandung</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  "Sebagai freelancer dengan penghasilan yang tidak tetap, fitur multi-wallet BCA dan GoPay ngebantu banget bedain uang operasional dan uang jajan. Fitur scan struknya juga juara!"
                </p>
                <div className="text-orange-500 text-sm">★★★★★</div>
              </div>

              {/* Testi 3 */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    FH
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">Fajar Hidayat</p>
                    <p className="text-xs text-slate-500">Mahasiswa Tingkat Akhir • Yogyakarta</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  "Reminder hariannya nolong banget buat anak kos. Sekarang tiap makan malam langsung keinget buat catat pengeluaran harian. Budgeting jadi terkontrol."
                </p>
                <div className="text-orange-500 text-sm">★★★★★</div>
              </div>
            </div>
          </div>
        </section>

        {/* 12. PRICING TABLE (Starter vs Pro) */}
        <section id="harga" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">
                Pilihan Paket
              </h2>
              <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                Investasi terbaik untuk kendali finansial masa depanmu
              </p>
              <p className="text-slate-600 text-sm mt-3">
                Tanpa biaya tersembunyi. Didukung pembayaran Midtrans otomatis (QRIS/Transfer) dan manual transfer.
              </p>

              {/* Billing Cycle Toggle */}
              <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Langganan Bulanan
                </button>
                <button
                  onClick={() => setBillingCycle('lifetime')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    billingCycle === 'lifetime'
                      ? 'bg-orange-600 text-white shadow-brand'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sekali Bayar (Paling Hemat 🔥)
                </button>
              </div>
            </div>

            {/* 2-Column Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
              {/* Starter Plan */}
              <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900">Starter</h3>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                      Pribadi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">
                    Cocok untuk yang baru mulai membiasakan diri mencatat keuangan harian lewat chat Telegram.
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-slate-900">Rp49.000</span>
                    <span className="text-xs text-slate-500 font-medium"> / bulan</span>
                  </div>

                  <ul className="space-y-3.5 text-xs text-slate-600 pb-8 border-b border-slate-100">
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Catat transaksi via teks Telegram</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Dashboard web lengkap</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Maksimal 50 transaksi / bulan</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Maksimal 3 dompet (wallet)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Maksimal 5 kategori budget</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-400">
                      <span className="w-4 h-4 text-center">✕</span>
                      <span className="line-through">Tidak ada input via foto struk</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-400">
                      <span className="w-4 h-4 text-center">✕</span>
                      <span className="line-through">Tidak ada AI Financial Advisor</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-400">
                      <span className="w-4 h-4 text-center">✕</span>
                      <span className="line-through">Tidak ada export PDF / Excel</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <Link
                    href="/auth/register"
                    className="w-full block text-center py-3.5 px-4 font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Mulai Starter
                  </Link>
                </div>
              </div>

              {/* Pro Plan (Highlighted) */}
              <div className="p-8 rounded-3xl bg-white border-2 border-orange-500 shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-600 to-amber-500 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 px-6 rounded-bl-xl shadow-sm">
                  Paling Populer
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      Pro
                      <Sparkles className="w-4 h-4 text-orange-500" />
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-6">
                    Solusi komprehensif tanpa batasan dengan AI Vision OCR dan AI Financial Advisor.
                  </p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-slate-900">Rp99.000</span>
                    <span className="text-xs text-orange-600 font-bold block sm:inline sm:ml-2">
                      Sekali Bayar Seumur Hidup!
                    </span>
                  </div>

                  <ul className="space-y-3.5 text-xs text-slate-700 pb-8 border-b border-slate-100">
                    <li className="flex items-center gap-3 font-semibold text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span>Semua fitur paket Starter</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span><strong>Unlimited transaksi</strong> per bulan</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span><strong>Unlimited wallet & budget kategori</strong></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span><strong>Input foto struk dengan AI Vision OCR</strong></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span><strong>Laporan & export unlimited ke PDF & Excel</strong></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span><strong>AI Financial Advisor aktif otomatis</strong></span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span>Reminder custom harian (1x/2x sehari)</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0" />
                      <span>Prioritas bantuan customer support</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-6">
                  <Link
                    href="/auth/register"
                    className="w-full block text-center py-3.5 px-4 font-bold text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-brand hover:shadow-brand-lg transition-all"
                  >
                    Dapatkan Akses Pro Sekarang
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 13. FAQ ACCORDION (Minimal 7 Questions) */}
        <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-2">
                Pertanyaan Umum
              </h2>
              <p className="text-3xl font-extrabold text-slate-900">
                Punya pertanyaan tentang TataDana?
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full p-5 text-left font-bold text-sm text-slate-800 flex items-center justify-between gap-4 hover:text-orange-600 transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${
                          isOpen ? 'rotate-180 text-orange-600' : 'text-slate-400'
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 14. FINAL CTA SECTION */}
        <section className="py-20 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
              Mulai kendalikan keuanganmu hari ini
            </h2>
            <p className="text-base sm:text-lg text-orange-50 max-w-2xl mx-auto leading-relaxed">
              Bergabung bersama ribuan pengguna cerdas yang telah mengubah cara mereka mengelola uang. Catat sekarang langsung dari Telegram.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              {currentUser ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-orange-600 bg-white hover:bg-orange-50 shadow-lg text-sm transition-all"
                >
                  Masuk Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-orange-600 bg-white hover:bg-orange-50 shadow-lg text-sm transition-all"
                  >
                    Daftar Gratis Sekarang
                  </Link>
                  <Link
                    href="/dashboard"
                    className="w-full sm:w-auto px-7 py-4 rounded-xl font-bold text-white bg-orange-700/60 hover:bg-orange-700 border border-orange-400/50 text-sm transition-all"
                  >
                    Buka Live Dashboard Demo →
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 15. Footer (4 Columns) */}
      <Footer />
    </div>
  );
}
