'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';

export default function GlobalFAB() {
  const { user } = useAuth();
  const [activeAccountId, setActiveAccountId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleAccountChange = (e: any) => {
      setActiveAccountId(e.detail.accountId);
    };

    const handleModalOpen = () => setIsModalOpen(true);
    const handleModalClose = () => setIsModalOpen(false);

    window.addEventListener('account-changed', handleAccountChange);
    window.addEventListener('open-add-expense', handleModalOpen);
    window.addEventListener('close-add-expense', handleModalClose);

    return () => {
      window.removeEventListener('account-changed', handleAccountChange);
      window.removeEventListener('open-add-expense', handleModalOpen);
      window.removeEventListener('close-add-expense', handleModalClose);
    };
  }, []);

  if (!user || isModalOpen) return null;

  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent('open-add-expense', { detail: { accountId: activeAccountId } })
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <button
        onClick={handleClick}
        className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full p-4 md:py-3 md:px-5 shadow-[0_8px_30px_rgb(16,185,129,0.3)] hover:shadow-[0_8px_40px_rgb(16,185,129,0.4)] transition-all transform hover:scale-105"
        title="Add Expense"
      >
        <Plus className="w-6 h-6 md:w-5 md:h-5" />
        <span className="hidden md:inline font-medium">Add Expense</span>
      </button>
    </div>
  );
}
