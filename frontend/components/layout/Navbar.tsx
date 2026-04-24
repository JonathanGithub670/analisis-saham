"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StockSearch from "@/components/stocks/StockSearch";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-[var(--color-dark-border)] rounded-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">
              StockPulse
            </span>
          </Link>

          {/* Search - Desktop */}
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <StockSearch />
          </div>

          {/* Nav Links - Desktop */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm font-medium"
            >
              Dashboard
            </Link>


            {/* Auth Section */}
            {!loading && (
              user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-dark-border)] hover:border-[var(--color-accent-cyan)]/30 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-[var(--color-text-secondary)]">{user.username}</span>
                    <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-56 glass-card p-2 z-50"
                        >
                          <div className="px-3 py-2 border-b border-[var(--color-dark-border)] mb-1">
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">{user.username}</p>
                            <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
                          </div>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 text-sm text-[var(--color-accent-red)] hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            Sign Out
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="btn-primary text-xs py-2 px-4"
                  >
                    Sign Up
                  </Link>
                </div>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[var(--color-dark-border)]"
          >
            <div className="px-4 py-4 space-y-3">
              <StockSearch />
              <Link href="/" className="block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-2">Dashboard</Link>


              {!loading && (
                <div className="border-t border-[var(--color-dark-border)] pt-3">
                  {user ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-[var(--color-text-secondary)]">{user.username}</span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left text-sm text-[var(--color-accent-red)] hover:bg-red-500/10 py-2 px-1 rounded-lg transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Link href="/login" className="block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-2">Sign In</Link>
                      <Link href="/register" className="btn-primary text-xs py-2 px-4 text-center">Sign Up</Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
