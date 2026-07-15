'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Target, Plus, Loader2, Edit2, Trash2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import Select from '../../components/Select';
import { CATEGORIES } from '../../constants/categories';

export default function BudgetPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].key);
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [user, loading, router]);

  const fetchData = async () => {
    try {
      const [bRes, aRes] = await Promise.all([
        api.get('/api/budget'),
        api.get('/api/accounts')
      ]);
      setBudgets(bRes.data.data.budgets);
      setAccounts(aRes.data.data.accounts);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/budget', {
        category: selectedCategory,
        amount: parseFloat(amount),
        accountId: selectedAccountId === 'all' ? null : selectedAccountId
      });
      setAmount('');
      fetchData();
    } catch (err) {
      console.error('Failed to save budget', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/budget/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete budget', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleEditBudget = (budget: any) => {
    setSelectedCategory(budget.category);
    setSelectedAccountId(budget.accountId || 'all');
    setAmount(parseFloat(budget.amount).toString());
    // Smooth scroll to top on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto w-full px-6 py-8 animate-in">
      <PageHeader 
        title="Budgets" 
        subtitle="Set monthly limits. We'll automatically alert you when you cross 50%, 90%, and 100%."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Set Budget Form */}
        <div className="md:col-span-1">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold text-foreground">Set Budget</h2>
            </div>
            
            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground pl-1">Category</label>
                <Select
                  options={CATEGORIES.map(cat => ({ label: cat.label, value: cat.key }))}
                  value={selectedCategory}
                  onChange={(val) => setSelectedCategory(val)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground pl-1">Account</label>
                <Select
                  options={[{ label: 'Global (All Accounts)', value: 'all' }, ...accounts.map(a => ({ label: a.name, value: a.id }))]}
                  value={selectedAccountId}
                  onChange={(val) => setSelectedAccountId(val)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground pl-1">Monthly Limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">$</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="500"
                    className="w-full glass-input text-foreground rounded-lg pl-8 pr-3 py-2.5 text-sm bg-input border-border"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Save Budget</>}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Budgets */}
        <div className="md:col-span-2">
          <div className="glass-panel p-6 rounded-2xl min-h-[300px]">
            <h2 className="text-lg font-semibold text-foreground mb-6">Active Budgets</h2>
            
            {fetching ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            ) : budgets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No budgets set. Create one to start tracking.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {budgets.map((b) => {
                  const catDef = CATEGORIES.find(c => c.key === b.category) || CATEGORIES.find(c => c.key === 'MISCELLANEOUS')!;
                  const Icon = catDef.icon;
                  return (
                    <div key={b.id} className="p-4 rounded-xl border border-border bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${catDef.color}15` }}>
                          <Icon className="w-5 h-5" style={{ color: catDef.color }} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate max-w-[120px]">{catDef.label}</p>
                          <p className="text-xl font-bold text-foreground">${parseFloat(b.amount).toFixed(0)}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {b.account ? b.account.name : 'Global'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditBudget(b)}
                          className="p-2 rounded-md hover:bg-input text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit budget"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
                          disabled={deleting === b.id}
                          className="p-2 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete budget"
                        >
                          {deleting === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
