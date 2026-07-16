'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Wallet, LogOut, ScanLine, LayoutDashboard, Target, Sun, Moon, Plus, Menu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import UserDropdown from './UserDropdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  // Note: we removed `if (!user) return null;` so Navbar renders on public pages too.
  // Note: we removed `if (!user) return null;` so Navbar renders on public pages too.



  return (
    <nav className={cn(
      "sticky top-0 z-50 glass-panel border-b border-border px-6 py-3 items-center justify-between min-h-[64px]",
      user ? "flex md:hidden" : "flex"
    )}>
      <div className="flex items-center gap-4">
        {user && (
          <button 
            onClick={() => window.dispatchEvent(new Event('toggle-mobile-menu'))}
            className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-input hover:text-foreground transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        {!user && (
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Expense<span className="text-emerald-500 dark:text-emerald-400">IQ</span></span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!user && (
          <>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-input hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors border border-transparent hover:border-yellow-500/20"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2 ml-2">
              <Link href="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-input">
                Sign In
              </Link>
              <Link href="/auth" className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity border border-transparent">
                Sign Up
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
