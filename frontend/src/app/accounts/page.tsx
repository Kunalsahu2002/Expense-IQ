'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Wallet, Briefcase, CreditCard, Building2, Plus, Edit2, Trash2, Loader2, AlertTriangle, CheckCircle, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Card from '../../components/Card';
import Select from '../../components/Select';

const ACCOUNT_TYPES = [
  { value: 'BANK', label: 'Bank Account', icon: Building2 },
  { value: 'CASH', label: 'Cash / Wallet', icon: Wallet },
  { value: 'CREDIT', label: 'Credit Card', icon: CreditCard },
  { value: 'OTHER', label: 'Other', icon: Briefcase },
];

export default function AccountsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', type: 'BANK', isDefault: false, totalBudget: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/api/accounts');
      setAccounts(res.data.data.accounts);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  const handleOpenModal = (account: any = null) => {
    setError('');
    if (account) {
      setEditingAccount(account);
      setFormData({ name: account.name, type: account.type, isDefault: account.isDefault || false, totalBudget: account.totalBudget || '' });
    } else {
      setEditingAccount(null);
      setFormData({ name: '', type: 'BANK', isDefault: false, totalBudget: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingAccount) {
        await api.put(`/api/accounts/${editingAccount.id}`, {
          ...formData,
          totalBudget: formData.totalBudget ? parseFloat(formData.totalBudget) : null
        });
      } else {
        await api.post('/api/accounts', {
          ...formData,
          totalBudget: formData.totalBudget ? parseFloat(formData.totalBudget) : null
        });
      }
      setIsModalOpen(false);
      fetchAccounts();
      window.dispatchEvent(new Event('accounts-updated'));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (accountId: string, name: string, expensesCount: number) => {
    if (expensesCount > 0) {
      alert(`Cannot delete account "${name}" because it has ${expensesCount} expenses attached to it. Please reassign them first.`);
      return;
    }
    
    if (accounts.length <= 1) {
      alert('You must have at least one account.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      await api.delete(`/api/accounts/${accountId}`);
      fetchAccounts();
      window.dispatchEvent(new Event('accounts-updated'));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete account.');
    }
  };

  if (loading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-8 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <PageHeader 
          title="Accounts" 
          subtitle="Manage your financial accounts and wallets."
        />
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-500 hover:bg-emerald-400 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2 whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-5 h-5" /> New Account
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {dataLoading ? (
          <div className="col-span-1 sm:col-span-2 flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          </div>
        ) : (
          accounts.map(account => {
            const typeDef = ACCOUNT_TYPES.find(t => t.value === account.type) || ACCOUNT_TYPES[0];
            const Icon = typeDef.icon;
            
            return (
              <Card key={account.id} className="group flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground">{account.name}</h3>
                        {account.isDefault && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium uppercase tracking-wider">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{typeDef.label}</p>
                    </div>
                  </div>
                  
                  <div className="bg-input/50 rounded-lg p-3 flex flex-col gap-2 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Transactions</span>
                      <span className="text-sm font-medium text-foreground">{account._count.expenses}</span>
                    </div>
                    {account.totalBudget && (
                      <div className="flex items-center justify-between border-t border-border/50 pt-2">
                        <span className="text-sm text-muted-foreground">Total Budget</span>
                        <span className="text-sm font-medium text-foreground">${parseFloat(account.totalBudget).toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(account)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md hover:bg-input text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id, account.name, account._count.expenses)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 text-sm font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative glass-panel rounded-2xl p-6 w-full max-w-md animate-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">{editingAccount ? 'Edit Account' : 'New Account'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-input transition-colors text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground pl-1">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Sapphire, Cash, Main Checking"
                  className="w-full glass-input text-foreground rounded-lg px-3 py-2 text-sm bg-input border-border"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground pl-1">Account Type</label>
                <Select
                  options={ACCOUNT_TYPES.map(type => ({ label: type.label, value: type.value }))}
                  value={formData.type}
                  onChange={(val) => setFormData({...formData, type: val})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground pl-1">Total Budget (Optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 5000"
                  className="w-full glass-input text-foreground rounded-lg px-3 py-2 text-sm bg-input border-border"
                  value={formData.totalBudget}
                  onChange={(e) => setFormData({...formData, totalBudget: e.target.value})}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-emerald-500 focus:ring-emerald-500 bg-input"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                />
                <span className="text-sm font-medium text-foreground">Set as default account</span>
              </label>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Save Account</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
