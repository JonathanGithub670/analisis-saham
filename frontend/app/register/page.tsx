"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import GridShape from "@/components/common/GridShape";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, username, password });
      router.push("/login?registered=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col dark:bg-gray-900 sm:p-0">
        {/* Left Side - Form */}
        <div className="flex flex-1 p-6 sm:p-12 overflow-y-auto">
          <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
            <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
              <Link
                href="/"
                className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Back to dashboard
              </Link>
            </div>
            <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
              <div>
                <div className="mb-5 sm:mb-8">
                  <h1 className="mb-2 font-semibold text-gray-800 text-2xl sm:text-3xl dark:text-white/90">
                    Sign Up
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Join StockPulse and start analyzing stocks!
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-error-50 border border-error-200 text-error-600 text-sm dark:bg-error-500/10 dark:border-error-500/30 dark:text-error-400">
                    {error}
                  </div>
                )}

                <div>
                  {/* Social Signup Buttons */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5">
                    <button className="inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z" fill="#4285F4" />
                        <path d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z" fill="#34A853" />
                        <path d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z" fill="#FBBC05" />
                        <path d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z" fill="#EB4335" />
                      </svg>
                      Sign up with Google
                    </button>
                    <button className="inline-flex items-center justify-center gap-3 py-3 text-sm font-normal text-gray-700 transition-colors bg-gray-100 rounded-lg px-7 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10">
                      <svg width="21" className="fill-current" height="20" viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15.6705 1.875H18.4272L12.4047 8.75833L19.4897 18.125H13.9422L9.59717 12.4442L4.62554 18.125H1.86721L8.30887 10.7625L1.51221 1.875H7.20054L11.128 7.0675L15.6705 1.875ZM14.703 16.475H16.2305L6.37054 3.43833H4.73137L14.703 16.475Z" />
                      </svg>
                      Sign up with X
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative py-3 sm:py-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="p-2 text-gray-400 bg-white dark:bg-gray-900 sm:px-5 sm:py-2">
                        Or
                      </span>
                    </div>
                  </div>

                  {/* Signup Form */}
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Username <span className="text-error-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Min. 3 characters"
                          className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Email <span className="text-error-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Password <span className="text-error-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min. 8 characters"
                            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 pr-12 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                          >
                            {showPassword ? (
                              <svg className="size-5 fill-gray-500 dark:fill-gray-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M10.0002 13.8619C7.23361 13.8619 4.86803 12.1372 3.92436 9.70964C4.86803 7.28204 7.23361 5.55731 10.0002 5.55731C12.7668 5.55731 15.1324 7.28204 16.076 9.70964C15.1324 12.1372 12.7668 13.8619 10.0002 13.8619ZM10.0002 4.30731C6.59456 4.30731 3.67627 6.47426 2.60034 9.47515C2.5543 9.6065 2.5543 9.81277 2.60034 9.94412C3.67627 12.945 6.59456 15.1119 10.0002 15.1119C13.4059 15.1119 16.3241 12.945 17.4001 9.94412C17.4461 9.81277 17.4461 9.6065 17.4001 9.47515C16.3241 6.47426 13.4059 4.30731 10.0002 4.30731ZM10.0002 7.85547C8.97655 7.85547 8.14601 8.68601 8.14601 9.70964C8.14601 10.7333 8.97655 11.5638 10.0002 11.5638C11.0238 11.5638 11.8543 10.7333 11.8543 9.70964C11.8543 8.68601 11.0238 7.85547 10.0002 7.85547ZM10.0002 12.8138C8.28797 12.8138 6.89601 11.4219 6.89601 9.70964C6.89601 7.99742 8.28797 6.60547 10.0002 6.60547C11.7124 6.60547 13.1043 7.99742 13.1043 9.70964C13.1043 11.4219 11.7124 12.8138 10.0002 12.8138Z" />
                              </svg>
                            ) : (
                              <svg className="size-5 fill-gray-500 dark:fill-gray-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M3.55602 4.45868L5.65364 7.00618C4.07284 8.03959 2.89678 9.55397 2.36819 11.3386C2.30673 11.5452 2.3333 11.7676 2.44217 11.9556C3.56498 13.8923 6.20048 16.1119 10.0002 16.1119C11.6815 16.1119 13.2428 15.5893 14.5609 14.6876L16.362 16.8757C16.6063 17.1752 17.0443 17.2202 17.3438 16.9759C17.6433 16.7316 17.6883 16.2936 17.444 15.9941L4.63803 3.57709C4.39372 3.27759 3.95572 3.23257 3.65623 3.47688C3.35673 3.72119 3.31171 4.15919 3.55602 4.45868Z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Confirm Password <span className="text-error-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat your password"
                            className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 pr-12 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                          >
                            {showConfirmPassword ? (
                              <svg className="size-5 fill-gray-500 dark:fill-gray-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M10.0002 13.8619C7.23361 13.8619 4.86803 12.1372 3.92436 9.70964C4.86803 7.28204 7.23361 5.55731 10.0002 5.55731C12.7668 5.55731 15.1324 7.28204 16.076 9.70964C15.1324 12.1372 12.7668 13.8619 10.0002 13.8619ZM10.0002 4.30731C6.59456 4.30731 3.67627 6.47426 2.60034 9.47515C2.5543 9.6065 2.5543 9.81277 2.60034 9.94412C3.67627 12.945 6.59456 15.1119 10.0002 15.1119C13.4059 15.1119 16.3241 12.945 17.4001 9.94412C17.4461 9.81277 17.4461 9.6065 17.4001 9.47515C16.3241 6.47426 13.4059 4.30731 10.0002 4.30731ZM10.0002 7.85547C8.97655 7.85547 8.14601 8.68601 8.14601 9.70964C8.14601 10.7333 8.97655 11.5638 10.0002 11.5638C11.0238 11.5638 11.8543 10.7333 11.8543 9.70964C11.8543 8.68601 11.0238 7.85547 10.0002 7.85547ZM10.0002 12.8138C8.28797 12.8138 6.89601 11.4219 6.89601 9.70964C6.89601 7.99742 8.28797 6.60547 10.0002 6.60547C11.7124 6.60547 13.1043 7.99742 13.1043 9.70964C13.1043 11.4219 11.7124 12.8138 10.0002 12.8138Z" />
                              </svg>
                            ) : (
                              <svg className="size-5 fill-gray-500 dark:fill-gray-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M3.55602 4.45868L5.65364 7.00618C4.07284 8.03959 2.89678 9.55397 2.36819 11.3386C2.30673 11.5452 2.3333 11.7676 2.44217 11.9556C3.56498 13.8923 6.20048 16.1119 10.0002 16.1119C11.6815 16.1119 13.2428 15.5893 14.5609 14.6876L16.362 16.8757C16.6063 17.1752 17.0443 17.2202 17.3438 16.9759C17.6433 16.7316 17.6883 16.2936 17.444 15.9941L4.63803 3.57709C4.39372 3.27759 3.95572 3.23257 3.65623 3.47688C3.35673 3.72119 3.31171 4.15919 3.55602 4.45868Z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Terms Checkbox */}
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="agreeTerms"
                          checked={agreeTerms}
                          onChange={(e) => setAgreeTerms(e.target.checked)}
                          className="w-5 h-5 mt-0.5 rounded-md border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer appearance-none border checked:bg-brand-500 checked:border-transparent dark:border-gray-700 shrink-0"
                        />
                        <label htmlFor="agreeTerms" className="text-sm font-normal text-gray-500 dark:text-gray-400 cursor-pointer">
                          By creating an account means you agree to the{" "}
                          <span className="text-gray-800 dark:text-white/90">Terms and Conditions,</span>{" "}
                          and our{" "}
                          <span className="text-gray-800 dark:text-white">Privacy Policy</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Creating account...
                          </span>
                        ) : (
                          "Sign Up"
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="mt-5">
                    <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                      Already have an account?{" "}
                      <Link href="/login" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                        Sign In
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Branding Panel */}
        <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
          <div className="relative items-center justify-center flex z-1">
            <GridShape />
            <div className="flex flex-col items-center max-w-xs">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center mb-6 shadow-lg">
                <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">StockPulse</h2>
              <p className="text-center text-gray-400 dark:text-white/60">
                AI-Powered Stock Analysis with Technical Indicators, ML Predictions, and Sentiment Analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
