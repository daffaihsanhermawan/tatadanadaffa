'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Minimize2, 
  Maximize2,
  Sparkles, 
  Wallet, 
  CheckCircle2, 
  RefreshCw,
  RotateCcw,
  Zap,
  CreditCard,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  parsed?: any;
}

interface ActionChip {
  id: string;
  emoji: string;
  label: string;
  prompt: string;
  badge?: string;
}

interface CategoryTab {
  id: 'commands' | 'wallets' | 'nlp';
  label: string;
  icon: React.ReactNode;
  chips: ActionChip[];
}

export default function FloatingAIBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeCategory, setActiveCategory] = useState<'commands' | 'wallets' | 'nlp'>('commands');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialGreeting: ChatMessage = {
    id: 'greet-1',
    sender: 'bot',
    text: `Halo Teman TataDana! 👋\nSaya TataDana AI Assistant. Kamu bisa mencatat keuangan secara instan lewat kalimat natural atau menggunakan tombol pintasan di bawah.\n\nContoh cepat:\n• 👛 Cek Saldo untuk melihat seluruh dompet\n• 📈 Audit Penghasilan untuk rapor keuangan 50/30/20\n• 🍜 Bakso 20rb GoPay untuk uji potong dompet spesifik\n• 🎯 Cek Budget untuk melihat limit anggaran`,
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  };

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);

    const onAuthChange = () => {
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('tatadana_auth_change', onAuthChange);

    const saved = sessionStorage.getItem('tatadana_ai_popup_chat');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        setMessages([initialGreeting]);
      }
    } else {
      setMessages([initialGreeting]);
    }

    return () => window.removeEventListener('tatadana_auth_change', onAuthChange);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('tatadana_ai_popup_chat', JSON.stringify(messages));
    }
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  if (!currentUser) {
    return null;
  }

  const handleClearHistory = () => {
    sessionStorage.removeItem('tatadana_ai_popup_chat');
    setMessages([initialGreeting]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!rawText || loading) return;

    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: rawText,
      time: timeNow
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: rawText,
          userId: currentUser.id || 'user-demo-tatadana'
        })
      });
      const data = await res.json();

      if (data.ok && data.reply) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          time: timeNow,
          parsed: data.parsed
        };
        setMessages(prev => [...prev, botMsg]);

        // Real-time UI event sync
        window.dispatchEvent(new Event('transaction-updated'));
        window.dispatchEvent(new Event('wallet-updated'));
      } else {
        const errorReply: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.message || 'Maaf, format pesan tidak dapat diproses. Coba pilih pintasan di bawah atau ketik: "Beli bakso 15rb".',
          time: timeNow
        };
        setMessages(prev => [...prev, errorReply]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'Terjadi gangguan koneksi saat menghubungi AI Assistant. Silakan coba lagi.',
        time: timeNow
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Categorized Quick Action Toolbar Data
  const categories: CategoryTab[] = [
    {
      id: 'commands',
      label: 'Pintasan Bot',
      icon: <Zap className="w-3 h-3 text-amber-400" />,
      chips: [
        { id: 'c1', emoji: '👛', label: 'Cek Saldo', prompt: 'Cek Saldo' },
        { id: 'c2', emoji: '📈', label: 'Audit Penghasilan', prompt: 'Audit Penghasilan' },
        { id: 'c3', emoji: '🎯', label: 'Cek Budget', prompt: 'Cek Budget' },
        { id: 'c4', emoji: '📅', label: 'Rekap Hari Ini', prompt: 'Rekap Hari Ini' },
        { id: 'c5', emoji: '📊', label: 'Rekap Bulan Ini', prompt: 'Rekap Bulan Ini' },
        { id: 'c6', emoji: '💡', label: 'Tips Hemat', prompt: 'Tips Hemat' },
        { id: 'c7', emoji: '📄', label: 'Laporan', prompt: 'Laporan' },
      ]
    },
    {
      id: 'wallets',
      label: 'Multi-Dompet',
      icon: <CreditCard className="w-3 h-3 text-cyan-400" />,
      chips: [
        { id: 'w1', emoji: '🍜', label: 'Bakso 20rb GoPay', prompt: 'bakso 20rb gopay' },
        { id: 'w2', emoji: '☕', label: 'Kopi 25rb Tunai', prompt: 'kopi 25rb tunai' },
        { id: 'w3', emoji: '🍛', label: 'Makan 35rb BCA', prompt: 'makan 35rb bca' },
        { id: 'w4', emoji: '⚡', label: 'Listrik 150rb Mandiri', prompt: 'bayar listrik 150rb mandiri' },
        { id: 'w5', emoji: '🛒', label: 'Belanja 150rb Spay', prompt: 'belanja 150rb shopeepay' },
        { id: 'w6', emoji: '🚗', label: 'Bensin 50rb OVO', prompt: 'bensin 50rb ovo' },
      ]
    },
    {
      id: 'nlp',
      label: 'Contoh Alami',
      icon: <MessageSquare className="w-3 h-3 text-emerald-400" />,
      chips: [
        { id: 'n1', emoji: '🍕', label: 'Pizza 75rb', prompt: 'Beli pizza delivery 75rb' },
        { id: 'n2', emoji: '💰', label: 'Gajian 8jt', prompt: 'gajian 8jt' },
        { id: 'n3', emoji: '🎬', label: 'Bioskop 60rb', prompt: 'nonton bioskop 60rb' },
        { id: 'n4', emoji: '💊', label: 'Apotek 35rb', prompt: 'beli obat di apotek 35rb' },
        { id: 'n5', emoji: '📱', label: 'iPhone 20jt tgl 14 okt', prompt: 'Beli iPhone 20jt tanggal 14 oktober' },
      ]
    }
  ];

  const currentTab = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <>
      {/* Floating Trigger Button (Bottom-Right) */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 select-none">
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group relative flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold rounded-full shadow-[0_10px_30px_-4px_rgba(255,107,0,0.45)] hover:shadow-[0_15px_35px_-2px_rgba(255,107,0,0.6)] transition-all duration-300 hover:scale-105 active:scale-95 border border-white/25"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white text-orange-600 flex items-center justify-center font-black shadow-sm group-hover:rotate-12 transition-transform">
                <Sparkles className="w-4 h-4 text-orange-600" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full" />
            </div>
            <div className="text-left pr-1">
              <p className="text-xs font-black tracking-tight leading-none">TataDana AI</p>
              <p className="text-[10px] text-orange-100 font-medium">Catat Cepat Disini</p>
            </div>
          </button>
        </div>
      )}

      {/* Minimized Docked State */}
      {isOpen && isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 select-none">
          <button
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/95 hover:bg-slate-800 border border-orange-500/50 hover:border-orange-400 text-white rounded-full shadow-2xl backdrop-blur-lg transition-all hover:scale-105"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100">TataDana AI (Aktif)</span>
            <Maximize2 className="w-3.5 h-3.5 text-orange-400 ml-1" />
          </button>
        </div>
      )}

      {/* Floating Popup Modal Dialog */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[420px] max-h-[90vh] h-[620px] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_35px_rgba(255,107,0,0.12)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 p-4 flex items-center justify-between text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30" />
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-white text-orange-600 flex items-center justify-center font-black shadow-inner text-xs">
                  TD
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-orange-600 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm tracking-tight">TataDana AI Assistant</h3>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">Bot NLP</span>
                </div>
                <p className="text-[10px] text-orange-100 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online • Natural Language WIB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Hapus Riwayat Chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Kecilkan Dialog"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Tutup Popup"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Subtitle / Tip Bar */}
          <div className="bg-slate-800/80 px-3.5 py-1.5 border-b border-slate-700/80 flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Gunakan shortcut di bawah atau ketik bebas</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">WIB (Asia/Jakarta)</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0e1621] text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl whitespace-pre-line leading-relaxed shadow-sm transition-all ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-br-none font-medium'
                      : 'bg-[#152232] text-slate-100 rounded-bl-none border border-slate-700/60 font-mono text-[11px]'
                  }`}
                >
                  <p>{msg.text}</p>
                  <p
                    className={`text-[9px] text-right mt-1.5 ${
                      msg.sender === 'user' ? 'text-orange-200' : 'text-slate-400 font-sans'
                    }`}
                  >
                    {msg.time} WIB
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="p-3 bg-[#152232] text-slate-300 rounded-2xl rounded-bl-none border border-slate-700/60 flex items-center gap-2 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  <span>TataDana AI sedang memproses transaksi...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Dedicated Categorized Shortcut Toolbar */}
          <div className="bg-slate-900/95 border-t border-slate-800/90 flex flex-col">
            {/* Category Tab Bar */}
            <div className="flex items-center gap-1 px-3 pt-2 pb-1.5 border-b border-slate-800/60">
              {categories.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                    activeCategory === tab.id
                      ? 'bg-gradient-to-r from-orange-600/25 to-amber-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_10px_rgba(255,107,0,0.15)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Chips Carousel with Left/Right Gradient Masks */}
            <div className="relative px-3 py-2 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none z-10" />
              
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
                {currentTab.chips.map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => handleSendMessage(chip.prompt)}
                    disabled={loading}
                    title={`Kirim: "${chip.prompt}"`}
                    className="group/chip shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/70 hover:border-orange-500/60 text-slate-200 hover:text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 hover:shadow-[0_0_12px_rgba(255,107,0,0.25)] disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span className="text-xs transition-transform group-hover/chip:scale-110">{chip.emoji}</span>
                    <span className="tracking-tight">{chip.label}</span>
                  </button>
                ))}
              </div>

              <div className="absolute right-0 top-0 bottom-0 w-3 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none z-10" />
            </div>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder='Ketik misal: "bakso 20rb gopay" atau pilih shortcut...'
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 text-white placeholder-slate-400 border border-slate-700 rounded-xl text-xs focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-xl shadow-md transition-all active:scale-95 shrink-0"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
