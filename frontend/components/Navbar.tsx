'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useI18n } from '@/i18n';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();
  // TODO: Get user from session/context

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container-main py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/saludclick.png"
              alt="SaludClick"
              width={56}
              height={56}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/doctors" className="hover:text-primary">
              {t('doctors')}
            </Link>
            <Link href="/health-centers" className="hover:text-primary">
              {t('healthCenters')}
            </Link>
            <Link href="/about" className="hover:text-primary">
              {t('about')}
            </Link>

            {/* Auth Links */}
            <div className="flex items-center gap-4 ml-4 border-l pl-4">
              <Link href="/login" className="text-primary hover:text-blue-700">
                {t('login')}
              </Link>
              <Link href="/register" className="btn-primary">
                {t('register')}
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 space-y-4">
            <Link href="/doctors" className="block hover:text-primary">
              {t('doctors')}
            </Link>
            <Link href="/health-centers" className="block hover:text-primary">
              {t('healthCenters')}
            </Link>
            <Link href="/login" className="block text-primary">
              {t('login')}
            </Link>
            <Link href="/register" className="btn-primary block text-center">
              {t('register')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
