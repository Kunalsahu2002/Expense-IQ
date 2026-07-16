'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, LayoutDashboard, ScanLine, Target, Building2, Settings, ChevronLeft, ChevronRight, X, Sun, Moon, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import AccountSwitcher from './AccountSwitcher';
import UserDropdown from './UserDropdown';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) setCollapsed(saved === 'true');
  }, []);

  // Handle mobile menu events
  useEffect(() => {
    const handleToggle = () => setMobileOpen(prev => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener('toggle-mobile-menu', handleToggle);
    window.addEventListener('close-mobile-menu', handleClose);
    return () => {
      window.removeEventListener('toggle-mobile-menu', handleToggle);
      window.removeEventListener('close-mobile-menu', handleClose);
    };
  }, []);

  // Close mobile menu on navigate
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileOpen]);

  // Save state
  const toggleCollapse = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('sidebar-collapsed', String(newVal));
  };

  // Only render for authenticated users
  if (!user) return null;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: Wallet },
    { name: 'Add Expense', onClick: () => window.dispatchEvent(new CustomEvent('open-add-expense', { detail: { accountId: activeAccountId } })), icon: Plus },
    { name: 'Scan Receipt', href: '/scan', icon: ScanLine },
    { name: 'Budgets', href: '/budget', icon: Target },
    { name: 'Accounts', href: '/accounts', icon: Building2 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed md:relative top-0 left-0 h-screen bg-background border-r border-border transition-all duration-300 z-[70] flex flex-col",
          collapsed ? "md:w-[80px]" : "md:w-[240px]",
          mobileOpen ? "translate-x-0 w-[280px]" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Collapse Toggle (Desktop only) */}
        <button 
          onClick={toggleCollapse}
          className="hidden md:flex absolute -right-4 top-6 w-8 h-8 bg-background border border-border rounded-full items-center justify-center text-muted-foreground hover:text-foreground z-10 hover:shadow-md transition-all shadow-sm"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Close Button (Mobile only) */}
        <button 
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute right-4 top-5 w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-input rounded-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Section */}
      <Link href="/" className="p-4 flex items-center gap-2 mb-6 mt-2 overflow-hidden group hover:opacity-90 transition-opacity">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-xl font-bold tracking-tight text-foreground whitespace-nowrap">
            Expense<span className="text-emerald-500 dark:text-emerald-400">IQ</span>
          </span>
        )}
      </Link>

      {/* Scrollable Main Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-4 flex flex-col">
        {/* Navigation List */}
        <div className="px-3 space-y-1">
          {navItems.map((item) => {
            if (item.onClick) {
              return (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  title={collapsed ? item.name : undefined}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group text-muted-foreground hover:text-foreground hover:bg-input"
                >
                  <item.icon className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            }

            const isActive = item.href ? pathname === item.href : false;
            return (
              <Link
                key={item.name}
                href={item.href!}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                  isActive 
                    ? "bg-emerald-500/10 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-input"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground group-hover:text-foreground")} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div className="px-4 py-4">
          <div className="h-px bg-border w-full"></div>
        </div>

        {/* Settings & Account Switcher */}
        <div className="px-3 space-y-2">
          <Link
            href="/settings"
            title={collapsed ? "Settings" : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-input group"
          >
            <Settings className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
            {!collapsed && <span className="truncate">Settings</span>}
          </Link>
          
          <div className="w-full">
            <AccountSwitcher 
              activeAccountId={activeAccountId}
              onAccountChange={(id, name) => {
                setActiveAccountId(id);
                window.dispatchEvent(new CustomEvent('account-changed', { detail: { accountId: id, accountName: name } }));
              }}
              collapsed={collapsed}
            />
          </div>
        </div>
      </div>

      {/* Pinned Bottom Row */}
      <div className="p-3 border-t border-border mt-auto">
        <div className={cn(
          "flex items-center gap-3 justify-center",
          collapsed ? "flex-col" : "flex-row"
        )}>
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-input hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors shrink-0"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <UserDropdown user={user} onLogout={logout} collapsed={collapsed} />
        </div>
      </div>
    </aside>
    </>
  );
}
