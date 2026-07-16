'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

interface UserDropdownProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  onLogout: () => void;
  collapsed?: boolean;
}

export default function UserDropdown({ user, onLogout, collapsed = false }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
  const avatarUrl = user.avatarUrl ? `http://localhost:5000${user.avatarUrl}` : null;

  return (
    <div className="relative flex justify-center w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shrink-0 overflow-hidden"
        title={collapsed ? user.name : undefined}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-64 glass-panel rounded-xl shadow-xl border border-border overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-4 border-b border-border bg-black/[0.02] dark:bg-white/[0.02]">
            <p className="font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          
          <div className="p-2">
            <Link 
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-input rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
          
          <div className="p-2 border-t border-border">
            <button 
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
