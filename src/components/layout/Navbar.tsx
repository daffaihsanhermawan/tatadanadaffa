'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Menu, X, ArrowRight, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    const onAuth = () => setCurrentUser(getCurrentUser());
    window.addEventListener('tatadana_auth_change', onAuth);
    return () => window.removeEventListener('tatadana_auth_change', onAuth);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-brand transition-transform group-hover:scale-105">
            <span className="font-extrabold text-xl tracking-tighter">TD</span>
          </div>
          <div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
              Tata<span className="text-orange-600">Dana</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
              ID
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
          <Link href="/#fitur" className="hover:text-orange-600 transition-colors">
            Fitur
          </Link>
          <Link href="/#demo" className="hover:text-orange-600 transition-colors">
            Cara Kerja
          </Link>
          <Link href="/#harga" className="hover:text-orange-600 transition-colors">
            Harga
          </Link>
          <Link href="/#faq" className="hover:text-orange-600 transition-colors">
            FAQ
          </Link>
          <Link href="/dashboard" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
            Live App Demo
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {currentUser ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 px-5 py-2.5 rounded-xl shadow-brand hover:shadow-brand-lg transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              Masuk Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-slate-700 hover:text-orange-600 px-4 py-2 transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 px-5 py-2.5 rounded-xl shadow-brand hover:shadow-brand-lg transition-all"
              >
                Coba Gratis
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3">
          <Link
            href="/#fitur"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-orange-50 rounded-lg"
          >
            Fitur
          </Link>
          <Link
            href="/#demo"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-orange-50 rounded-lg"
          >
            Cara Kerja
          </Link>
          <Link
            href="/#harga"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-orange-50 rounded-lg"
          >
            Harga
          </Link>
          <Link
            href="/#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-700 hover:bg-orange-50 rounded-lg"
          >
            FAQ
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-semibold text-orange-600 hover:bg-orange-50 rounded-lg"
          >
            Buka Dashboard Web
          </Link>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {currentUser ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 font-bold text-white bg-orange-600 rounded-xl shadow-brand flex items-center justify-center gap-2 text-sm"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Masuk Dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 font-semibold text-slate-700 bg-slate-100 rounded-xl"
                >
                  Masuk
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 font-semibold text-white bg-orange-600 rounded-xl shadow-brand"
                >
                  Coba Gratis Sekarang
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
