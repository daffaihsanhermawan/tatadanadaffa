import React from 'react';
import Link from 'next/link';
import { Send, Shield, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-12 border-b border-slate-800">
          {/* Kolom 1: Logo & Tagline */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-extrabold text-xl">
                TD
              </div>
              <span className="font-extrabold text-2xl text-white">
                Tata<span className="text-orange-500">Dana</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              Catat keuangan semudah chat — langsung dari Telegram kamu. Manajemen finansial modern untuk generasi produktif Indonesia.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://t.me/TataDanaBot"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-orange-600 hover:text-white flex items-center justify-center transition-colors text-slate-300"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <span className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Keamanan SSL 256-bit
              </span>
            </div>
          </div>

          {/* Kolom 2: Produk */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Produk
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/#fitur" className="hover:text-orange-400 transition-colors">
                  Integrasi Telegram Bot
                </Link>
              </li>
              <li>
                <Link href="/#fitur" className="hover:text-orange-400 transition-colors">
                  Scan Foto Struk (AI OCR)
                </Link>
              </li>
              <li>
                <Link href="/#fitur" className="hover:text-orange-400 transition-colors">
                  Catat Transaksi Voice Note
                </Link>
              </li>
              <li>
                <Link href="/#fitur" className="hover:text-orange-400 transition-colors">
                  AI Financial Advisor
                </Link>
              </li>
              <li>
                <Link href="/laporan" className="hover:text-orange-400 transition-colors">
                  Export Laporan PDF & Excel
                </Link>
              </li>
              <li>
                <Link href="/#harga" className="hover:text-orange-400 transition-colors">
                  Paket Langganan
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Perusahaan */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Perusahaan
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/#tentang" className="hover:text-orange-400 transition-colors">
                  Tentang TataDana
                </Link>
              </li>
              <li>
                <Link href="/#demo" className="hover:text-orange-400 transition-colors">
                  Cara Kerja
                </Link>
              </li>
              <li>
                <Link href="/#testimoni" className="hover:text-orange-400 transition-colors">
                  Cerita Pengguna
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-orange-400 transition-colors text-slate-400 hover:text-slate-200">
                  Portal Superadmin
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Legal & Kontak */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Bantuan & Legal
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/#faq" className="hover:text-orange-400 transition-colors">
                  Pusat Bantuan & FAQ
                </Link>
              </li>
              <li>
                <span className="cursor-pointer hover:text-orange-400 transition-colors">
                  Kebijakan Privasi
                </span>
              </li>
              <li>
                <span className="cursor-pointer hover:text-orange-400 transition-colors">
                  Syarat & Ketentuan
                </span>
              </li>
              <li>
                <a href="mailto:support@tatadana.id" className="hover:text-orange-400 transition-colors">
                  support@tatadana.id
                </a>
              </li>
              <li>
                <span className="text-xs text-slate-400 block pt-1">
                  Jakarta, Indonesia (WIB UTC+7)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} TataDana. Seluruh Hak Cipta Dilindungi.</p>
          <p className="flex items-center gap-1">
            Dibuat dengan <Heart className="w-3.5 h-3.5 text-orange-500 fill-orange-500 inline" /> untuk literasi keuangan Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
