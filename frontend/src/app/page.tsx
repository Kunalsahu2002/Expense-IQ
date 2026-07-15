'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, ArrowRight, Zap, ShieldCheck, Target, 
  LineChart, History, Lock, ChevronDown, CheckCircle, Wallet, LayoutDashboard
} from 'lucide-react';

export default function LandingPage() {
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "What AI model powers ExpenseIQ?",
      a: "By default, ExpenseIQ uses Tesseract OCR and Groq's Llama models for high-speed, local-first processing. You are in full control of the AI pipeline."
    },
    {
      q: "Is my financial data safe?",
      a: "Yes. Our deterministic guardrails ensure AI never writes directly to your database without your explicit validation. All data stays in your control."
    },
    {
      q: "What happens if AI extraction fails?",
      a: "If the AI cannot confidently extract data, our strict Zod schema validation will catch it and present a manual fallback form, ensuring your ledger is never corrupted."
    },
    {
      q: "Is this free to use?",
      a: "ExpenseIQ is open-source. You can self-host it entirely for free, or use our cloud-hosted version for convenience."
    },
    {
      q: "Can I export my data?",
      a: "Absolutely. You can export your full transaction ledger and audit logs at any time via CSV or our API."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-emerald-500/30 w-full overflow-hidden">
      
      {/* 1. Hero Section */}
      <section className="relative px-6 py-20 md:py-32 flex flex-col items-center justify-center">
        {/* Abstract Background Blurs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] h-[500px] pointer-events-none opacity-50 z-0 flex">
          <div className="w-1/2 h-full bg-emerald-500/20 blur-[100px] rounded-full" />
          <div className="w-1/2 h-full bg-blue-500/20 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-input border border-border text-emerald-600 dark:text-emerald-400 text-sm font-medium mb-8 animate-in fade-in slide-in-from-bottom-4">
            <Sparkles className="w-4 h-4" />
            <span>Deterministic Guardrails Included</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-in slide-in-from-bottom-6 text-foreground leading-[1.1]">
            The AI expense tracker <br className="hidden md:block" />
            that <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-blue-600 dark:from-emerald-400 dark:to-blue-500">you control.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 animate-in slide-in-from-bottom-8">
            Upload your receipts. The AI extracts the data. You review and confirm. 
            <strong className="text-foreground font-medium"> AI proposes, deterministic code decides.</strong>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-bottom-10">
            {user ? (
              <Link href="/dashboard" className="w-full sm:w-auto text-lg font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95">
                Go to Dashboard <LayoutDashboard className="w-5 h-5" />
              </Link>
            ) : (
              <Link href="/auth" className="w-full sm:w-auto text-lg font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:scale-105 active:scale-95">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-lg font-medium bg-input hover:bg-black/5 dark:hover:bg-white/10 text-foreground border border-border px-8 py-4 rounded-xl transition-all flex items-center justify-center gap-2">
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* 2. Product Mockup Section */}
      <section className="px-6 pb-24 relative z-10 animate-in slide-in-from-bottom-12 delay-150">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border bg-black/40 dark:bg-white/5 backdrop-blur-sm shadow-2xl overflow-hidden p-2">
            {/* Browser Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-black/5 dark:bg-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <div className="ml-4 px-3 py-1 rounded text-xs bg-black/5 dark:bg-white/5 text-muted-foreground border border-border font-mono">
                expense-iq.local/dashboard
              </div>
            </div>
            {/* Browser Content */}
            <div className="aspect-[16/10] md:aspect-[16/9] w-full bg-background relative overflow-hidden flex flex-col">
               {/* Mock Dashboard UI */}
               <div className="p-6 md:p-8 flex-1 overflow-hidden pointer-events-none">
                 <div className="flex items-center justify-between mb-8">
                   <div className="space-y-1">
                     <div className="h-6 w-48 bg-foreground/10 rounded animate-pulse" />
                     <div className="h-4 w-64 bg-muted-foreground/20 rounded animate-pulse" />
                   </div>
                   <div className="h-10 w-32 bg-emerald-500/20 rounded-lg border border-emerald-500/30" />
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-32 rounded-xl border border-border bg-input/50 p-5 flex flex-col justify-between">
                         <div className="w-8 h-8 rounded-lg bg-foreground/5" />
                         <div className="space-y-2">
                           <div className="h-4 w-1/2 bg-muted-foreground/20 rounded" />
                           <div className="h-6 w-3/4 bg-foreground/10 rounded" />
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="h-64 rounded-xl border border-border bg-input/30 p-5">
                    <div className="h-4 w-32 bg-muted-foreground/20 rounded mb-6" />
                    <div className="space-y-4">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="flex items-center justify-between border-b border-border pb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-foreground/5" />
                            <div className="space-y-2">
                              <div className="h-4 w-24 bg-foreground/10 rounded" />
                              <div className="h-3 w-16 bg-muted-foreground/20 rounded" />
                            </div>
                          </div>
                          <div className="h-5 w-16 bg-foreground/10 rounded" />
                        </div>
                      ))}
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="py-24 px-6 border-t border-border bg-black/5 dark:bg-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-16 text-lg">
            A frictionless pipeline from physical receipt to validated database entry.
          </p>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent -z-10" />

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 shadow-xl text-blue-500 font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Snap or Upload</h3>
              <p className="text-muted-foreground">Take a high-res photo or drag a receipt file. We accept JPG, PNG, and WebP.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 shadow-xl text-purple-500 font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">AI Extraction</h3>
              <p className="text-muted-foreground">Groq & Tesseract instantly parse the vendor, amount, date, and category into strict JSON.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-xl text-emerald-500 font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Review & Track</h3>
              <p className="text-muted-foreground">You review the proposed data. Once confirmed, it hits the deterministic ledger securely.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trust / Guardrails Section */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium">
              <Lock className="w-4 h-4" />
              <span>Zero-Trust AI Architecture</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">We don't trust LLMs.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Generative AI is amazing at parsing unstructured data, but terrible at deterministic math and database integrity. 
              <br/><br/>
              That's why ExpenseIQ uses a strict guardrail pipeline. The AI only <strong>proposes</strong> data. Our hard-coded Zod schemas validate it, our SHA-256 hash checks prevent duplicates, and <strong>you</strong> make the final decision.
            </p>
          </div>
          <div className="flex-1 w-full max-w-md">
            <div className="glass-panel p-6 rounded-2xl space-y-4 font-mono text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> JSON Schema Match</span>
                <span>PASS</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Hash Deduplication</span>
                <span>PASS</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4"/> User Confirmation</span>
                <span>PASS</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 mt-4">
                <span className="flex items-center gap-2"><ArrowRight className="w-4 h-4"/> Commit to Ledger</span>
                <span>SUCCESS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Expanded Feature Grid */}
      <section className="py-24 px-6 border-t border-border bg-black/5 dark:bg-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground text-lg">A professional-grade toolkit for personal finance.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20">
                <Zap className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Lightning Fast Extraction</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Snap a picture of your receipt and let Groq extract the vendor, amount, and date in milliseconds.
              </p>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20 relative">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 relative">Deterministic Guardrails</h3>
              <p className="text-muted-foreground leading-relaxed text-sm relative">
                Every AI output is strictly validated through Zod and SHA-256 deduplication before hitting your database.
              </p>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Smart Budgets</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Set monthly limits. We'll automatically alert you when you cross 50%, 90%, and 100% of your threshold.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6 border border-orange-500/20">
                <LineChart className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">AI Insights</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Natural-language narrations of your spending habits computed deterministically from your actual database records.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center mb-6 border border-teal-500/20">
                <History className="w-6 h-6 text-teal-500 dark:text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Tamper-Evident Audit Trail</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Every scan and manual edit is logged in an append-only audit trail for ultimate traceability.
              </p>
            </div>

            <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-zinc-500/10 flex items-center justify-center mb-6 border border-zinc-500/20">
                <CheckCircle className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Self-Hostable</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Built on Next.js, Express, and Prisma. Easily deploy your own instance and own your financial data completely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="py-24 px-6 border-t border-border max-w-3xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="glass-panel rounded-xl overflow-hidden transition-all duration-300"
            >
              <button 
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full text-left p-5 flex items-center justify-between hover:bg-input/50 transition-colors"
              >
                <span className="font-semibold text-lg pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} />
              </button>
              <div 
                className={`px-5 text-muted-foreground transition-all duration-300 ease-in-out overflow-hidden ${
                  openFaq === index ? 'max-h-48 pb-5 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="py-24 px-6 border-t border-border bg-foreground text-background text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to tame your expenses?</h2>
          <p className="text-xl text-background/80 mb-10">
            Join users who trust their finances to a deterministic AI architecture.
          </p>
          {user ? (
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-lg font-medium bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl transition-all shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 border border-transparent">
              Go to Dashboard <LayoutDashboard className="w-5 h-5" />
            </Link>
          ) : (
            <Link href="/auth" className="inline-flex items-center gap-2 text-lg font-medium bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-xl transition-all shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 border border-transparent">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="py-12 px-6 border-t border-border bg-black/5 dark:bg-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br from-emerald-400 to-blue-500">
              <Wallet className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">Expense<span className="text-emerald-500">IQ</span></span>
          </div>
          
          <div className="text-sm text-muted-foreground text-center md:text-left">
            AI proposes, deterministic code decides.
          </div>
          
          <div className="flex gap-6">
            <a href="https://github.com/kunalsahu2002/Expense-IQ" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Documentation
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-border text-center text-xs text-muted-foreground/60">
          &copy; {new Date().getFullYear()} ExpenseIQ. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
