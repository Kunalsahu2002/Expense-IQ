'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Wallet, Briefcase, CreditCard, ChevronDown, Check, Building2, Plus, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useRouter } from 'next/navigation';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Account {
  id: string;
  name: string;
  type: string;
  _count?: { expenses: number };
}

interface AccountSwitcherProps {
  activeAccountId: string | null;
  onAccountChange: (id: string | null, name: string) => void;
  collapsed?: boolean;
}

const getAccountIcon = (type: string) => {
  switch (type) {
    case 'BANK': return Building2;
    case 'CASH': return Wallet;
    case 'CREDIT': return CreditCard;
    default: return Briefcase;
  }
};

export default function AccountSwitcher({ activeAccountId, onAccountChange, collapsed = false }: AccountSwitcherProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const initialSelectDone = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/api/accounts');
        const accs = res.data.data.accounts;
        setAccounts(accs);
        
        // Handle default selection on first load
        if (!initialSelectDone.current) {
          initialSelectDone.current = true;
          const defaultAcc = accs.find((a: any) => a.isDefault);
          if (defaultAcc && !activeAccountId) {
            onAccountChange(defaultAcc.id, defaultAcc.name);
          }
        }
      } catch (error) {
        console.error('Failed to fetch accounts', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();

    const handleAccountsUpdated = () => {
      fetchAccounts();
    };

    window.addEventListener('accounts-updated', handleAccountsUpdated);
    return () => window.removeEventListener('accounts-updated', handleAccountsUpdated);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeAccount = activeAccountId ? accounts.find(a => a.id === activeAccountId) : null;
  const ActiveIcon = activeAccount ? getAccountIcon(activeAccount.type) : Wallet;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input text-muted-foreground text-sm opacity-50">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-lg transition-colors bg-input hover:bg-black/5 dark:hover:bg-white/10 text-foreground border border-transparent hover:border-emerald-500/20",
          collapsed ? "justify-center w-10 h-10 mx-auto" : "px-3 py-2 w-full justify-between"
        )}
        title={collapsed ? (activeAccount ? activeAccount.name : 'All Accounts') : undefined}
      >
        <div className="flex items-center gap-2">
          <ActiveIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          {!collapsed && (
            <span className="text-sm font-medium truncate max-w-[120px]">
              {activeAccount ? activeAccount.name : 'All Accounts'}
            </span>
          )}
        </div>
        {!collapsed && <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-xl shadow-xl z-50 p-2 border-border">
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {/* All Accounts Option */}
            <button
              onClick={() => {
                onAccountChange(null, 'All Accounts');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-left group"
            >
              <div className="flex items-center gap-3 text-foreground text-sm font-medium">
                <Wallet className="w-4 h-4 text-emerald-500" />
                All Accounts
              </div>
              {!activeAccountId && <Check className="w-4 h-4 text-emerald-500" />}
            </button>
            
            <div className="h-px bg-border my-1 mx-2" />

            {/* Individual Accounts */}
            {accounts.map(acc => {
              const Icon = getAccountIcon(acc.type);
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    onAccountChange(acc.id, acc.name);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 text-foreground text-sm">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="truncate">{acc.name}</span>
                  </div>
                  {activeAccountId === acc.id && <Check className="w-4 h-4 text-emerald-500" />}
                </button>
              );
            })}
          </div>

          <div className="h-px bg-border my-1 mx-2" />
          
          <button
            onClick={() => {
              setIsOpen(false);
              router.push('/accounts');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-left text-sm text-emerald-600 dark:text-emerald-400 font-medium"
          >
            <Plus className="w-4 h-4" /> Manage Accounts
          </button>
        </div>
      )}
    </div>
  );
}
