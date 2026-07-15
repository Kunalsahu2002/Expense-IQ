'use client';

import React, { useState } from 'react';
import { Wallet, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: 'test@example.com',
    password: 'Test1234'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const res = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        login(res.data.data.token, res.data.data.user);
      } else {
        const res = await api.post('/auth/register', formData);
        login(res.data.data.token, res.data.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in glass-panel rounded-2xl p-8 relative overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-blue-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to Expense<span className="text-emerald-500 dark:text-emerald-400">IQ</span></h1>
          <p className="text-muted-foreground text-sm text-center">
            {isLogin ? 'Sign in to access your financial guardrail.' : 'Create an account to start tracking expenses securely.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <div className="w-1 h-full bg-red-500 rounded-full" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground pl-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  className="w-full glass-input text-foreground rounded-lg pl-10 pr-4 py-2.5 text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground pl-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full glass-input text-foreground rounded-lg pl-10 pr-4 py-2.5 text-sm"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground pl-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full glass-input text-foreground rounded-lg pl-10 pr-4 py-2.5 text-sm"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="relative z-10 mt-6 text-center">
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
