import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import GlobalFAB from '../components/GlobalFAB';
import AddExpenseModal from '../components/AddExpenseModal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ExpenseIQ | AI Financial Guardrail',
  description: 'AI receipt-parsing expense tracker with deterministic guardrails.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} h-screen flex overflow-hidden bg-background`}>
        <ThemeProvider>
          <AuthProvider>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              <Navbar />
              <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-background/50">
                {children}
              </main>
              <GlobalFAB />
              <AddExpenseModal />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
