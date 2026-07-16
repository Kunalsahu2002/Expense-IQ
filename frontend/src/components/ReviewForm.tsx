'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';
import { CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { CATEGORIES } from '../constants/categories';
import Select from './Select';

interface ReviewFormProps {
  initialData: any;
  source: 'AI' | 'MANUAL';
  aiConfidence?: number;
  /** If provided, the form will PUT to update instead of POST to create */
  expenseId?: string;
  /** Called after successful save/update */
  onSuccess?: () => void;
}

export default function ReviewForm({ initialData, source, aiConfidence = 0, expenseId, onSuccess }: ReviewFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  
  // Inline account creation state
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('BANK');
  const [newAccountDefault, setNewAccountDefault] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    category: 'MISCELLANEOUS',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    accountId: ''
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await api.get('/api/accounts');
        const accs = res.data.data.accounts;
        setAccounts(accs);
        if (accs.length > 0 && !formData.accountId) {
          setFormData(prev => ({ ...prev, accountId: accs[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch accounts', err);
      }
    };
    fetchAccounts();
  }, []);

  // Sync initialData to form when it arrives
  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount || '',
        category: initialData.category || 'MISCELLANEOUS',
        vendor: initialData.vendor || '',
        date: initialData.date ? (typeof initialData.date === 'string' ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
        description: initialData.description || '',
        accountId: initialData.accountId || formData.accountId || (accounts.length > 0 ? accounts[0].id : '')
      });
    }
  }, [initialData, accounts]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      if (expenseId) {
        // Edit mode — PUT
        const updatePayload: any = {};
        if (formData.amount) updatePayload.amount = parseFloat(formData.amount);
        if (formData.category) updatePayload.category = formData.category;
        if (formData.vendor) updatePayload.vendor = formData.vendor;
        if (formData.date) updatePayload.date = new Date(formData.date).toISOString();
        if (formData.description !== undefined) updatePayload.description = formData.description;
        if (formData.accountId) updatePayload.accountId = formData.accountId;

        await api.put(`/api/expenses/${expenseId}`, updatePayload);
        if (onSuccess) onSuccess();
        else router.push('/transactions');
      } else {
        // Create mode — POST
        const payload: any = {
          amount: parseFloat(formData.amount),
          category: formData.category,
          vendor: formData.vendor,
          date: new Date(formData.date).toISOString(),
          description: formData.description,
          createdBy: source,
          accountId: formData.accountId || undefined
        };
        
        if (source === 'AI') {
          payload.aiConfidence = aiConfidence;
        }

        await api.post('/api/expenses', payload);
        if (onSuccess) onSuccess();
        else router.push('/transactions');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;
    setSavingAccount(true);
    try {
      const res = await api.post('/api/accounts', {
        name: newAccountName,
        type: newAccountType,
        isDefault: newAccountDefault
      });
      // trigger refetch
      window.dispatchEvent(new Event('accounts-updated'));
      
      const newAccountsRes = await api.get('/api/accounts');
      const updatedAccs = newAccountsRes.data.data.accounts;
      setAccounts(updatedAccs);
      
      const createdAcc = updatedAccs.find((a: any) => a.name === newAccountName);
      if (createdAcc) {
        setFormData(prev => ({ ...prev, accountId: createdAcc.id }));
      }
      setIsCreatingAccount(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setSavingAccount(false);
    }
  };

  const FieldLabel = ({ label, fieldName, originalValue }: { label: string, fieldName: string, originalValue: any }) => {
    const isAiExtracted = source === 'AI' && initialData && originalValue !== undefined && originalValue !== null;
    const currentValue = formData[fieldName as keyof typeof formData];
    const matches = currentValue == originalValue || (fieldName === 'date' && typeof originalValue === 'string' && originalValue.startsWith(currentValue));

    return (
      <div className="flex items-center gap-1.5 mb-1 pl-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {isAiExtracted && matches && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title="AI Extracted">
            <Sparkles className="w-2.5 h-2.5" />
            AI
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 animate-in">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <FieldLabel label="Amount" fieldName="amount" originalValue={initialData?.amount} />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">$</span>
            <input
              type="number"
              step="0.01"
              required
              className="w-full glass-input text-foreground rounded-lg pl-8 pr-3 py-2 text-sm bg-input border-border"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
          </div>
        </div>
        <div className="space-y-1">
          <FieldLabel label="Date" fieldName="date" originalValue={initialData?.date} />
          <input
            type="date"
            required
            className="w-full glass-input text-foreground rounded-lg px-3 py-2 text-sm bg-input border-border"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
          />
        </div>
      </div>

      <div className="space-y-1">
        <FieldLabel label="Vendor" fieldName="vendor" originalValue={initialData?.vendor} />
        <input
          type="text"
          required
          className="w-full glass-input text-foreground rounded-lg px-3 py-2 text-sm bg-input border-border"
          value={formData.vendor}
          onChange={(e) => setFormData({...formData, vendor: e.target.value})}
        />
      </div>

      <div className="space-y-1">
        <FieldLabel label="Category" fieldName="category" originalValue={initialData?.category} />
        <Select
          options={CATEGORIES.map(cat => ({ label: cat.label, value: cat.key }))}
          value={formData.category}
          onChange={(val) => setFormData({...formData, category: val})}
        />
      </div>

      {accounts.length > 0 ? (
        <div className="space-y-1">
          <FieldLabel label="Account" fieldName="accountId" originalValue={initialData?.accountId} />
          <Select
            options={accounts.map(acc => ({ label: acc.name, value: acc.id }))}
            value={formData.accountId}
            onChange={(val) => setFormData({...formData, accountId: val})}
          />
        </div>
      ) : (
        <div className="space-y-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">No accounts found</span>
            {!isCreatingAccount && (
              <button 
                type="button" 
                onClick={() => setIsCreatingAccount(true)}
                className="text-xs font-medium text-emerald-500 hover:text-emerald-600 transition-colors"
              >
                + Create Account
              </button>
            )}
          </div>
          
          {isCreatingAccount ? (
            <div className="space-y-3 pt-2">
              <input
                type="text"
                placeholder="Account Name (e.g. Personal)"
                className="w-full glass-input text-foreground rounded-lg px-3 py-2 text-sm bg-input border-border"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
              />
              <div className="flex gap-2">
                <Select
                  className="flex-1"
                  options={[
                    { value: 'BANK', label: 'Bank' },
                    { value: 'CASH', label: 'Cash' },
                    { value: 'CREDIT', label: 'Credit' }
                  ]}
                  value={newAccountType}
                  onChange={setNewAccountType}
                />
                <button
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={savingAccount || !newAccountName.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50"
                >
                  {savingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">You need an account to save an expense.</p>
          )}
        </div>
      )}

      <div className="space-y-1">
        <FieldLabel label="Description (Optional)" fieldName="description" originalValue={initialData?.description} />
        <input
          type="text"
          className="w-full glass-input text-foreground rounded-lg px-3 py-2 text-sm bg-input border-border"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> {expenseId ? 'Update' : 'Confirm & Save'}</>}
        </button>
      </div>
    </form>
  );
}
