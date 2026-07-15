'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Wallet, LogOut, ScanLine, LayoutDashboard, Target, Sun, Moon, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import UserDropdown from './UserDropdown';
import AccountSwitcher from './AccountSwitcher';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  // Note: we removed `if (!user) return null;` so Navbar renders on public pages too.
  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scan Receipt', href: '/scan', icon: ScanLine },
    { name: 'Budgets', href: '/budget', icon: Target },
  ];

  const [activeAccountId, setActiveAccountId] = React.useState<string | null>(null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-border px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">Expense<span className="text-emerald-500 dark:text-emerald-400">IQ</span></span>
        </Link>
        
        {user && (
          <div className="hidden md:flex items-center gap-1 bg-input p-1 rounded-lg border border-border">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-emerald-500/10 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                      : "text-muted-foreground hover:text-foreground hover:bg-input"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <AccountSwitcher 
            activeAccountId={activeAccountId} 
            onAccountChange={(id, name) => {
              setActiveAccountId(id);
              // Dispatch a custom event so other components (Dashboard, Transactions) can listen and reload
              window.dispatchEvent(new CustomEvent('account-changed', { detail: { accountId: id, accountName: name } }));
            }} 
          />
        )}
        
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-input hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors border border-transparent hover:border-yellow-500/20"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        {user ? (
          <UserDropdown user={user} onLogout={logout} />
        ) : (
          <div className="flex items-center gap-2 ml-2">
            <Link href="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-input">
              Sign In
            </Link>
            <Link href="/auth" className="text-sm font-medium bg-foreground text-background px-4 py-2 rounded-lg hover:opacity-90 transition-opacity border border-transparent">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
