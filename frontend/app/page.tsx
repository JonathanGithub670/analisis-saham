"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import GooeyNav from "@/components/common/GooeyNav";
import SettingsDrawer from "@/components/common/SettingsDrawer";
import Lanyard from "@/components/common/Lanyard";
import CardNav from "@/components/common/CardNav";
import "@/components/common/GooeyNav.css";



function FeatureCard({ title, description, icon, delay }: { title: string; description: string; icon: React.ReactNode; delay: number }) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setTimeout(() => setInView(true), delay);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`p-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm transition-all duration-700 transform ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
      <div className="w-12 h-12 flex items-center justify-center bg-brand-50 dark:bg-brand-500/10 text-brand-500 rounded-xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [frontendSkillsOpen, setFrontendSkillsOpen] = useState(false);
  const [backendSkillsOpen, setBackendSkillsOpen] = useState(false);
  const [mobileSkillsOpen, setMobileSkillsOpen] = useState(false);
  const [showPills, setShowPills] = useState(true);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      <SettingsDrawer />
      
      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-gray-900 dark:bg-white rounded-lg">
              <svg className="w-5 h-5 text-white dark:text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">StockPulse</span>
          </div>
          <GooeyNav
            items={[
              { label: theme === "dark" ? "☀" : "☽", isToggle: true, onClick: (e: any) => toggleTheme(e.nativeEvent) },
              { label: "Sign In", bordered: true, onClick: () => router.push("/login") },
              { label: "Get Started", bordered: true, onClick: () => router.push("/register") }
            ]}
          />
        </div>
      </nav>

      <main className="pb-16">
        {/* ─── Hero section ─── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center overflow-hidden">
          {/* Background light effect — soft aurora spread */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[700px] opacity-30 dark:opacity-20"
              style={{
                background: "radial-gradient(ellipse 70% 60% at 50% 0%, var(--color-brand-500) 0%, transparent 70%)"
              }}
            />
            <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] opacity-10 dark:opacity-10 rounded-full"
              style={{
                background: "radial-gradient(circle, var(--color-brand-400) 0%, transparent 70%)",
                filter: "blur(60px)"
              }}
            />
            <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] opacity-10 dark:opacity-10 rounded-full"
              style={{
                background: "radial-gradient(circle, var(--color-brand-400) 0%, transparent 70%)",
                filter: "blur(60px)"
              }}
            />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto">
            {/* Blurred glow behind hero text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[120%] pointer-events-none -z-10">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-[850px] h-[400px] opacity-40 dark:opacity-30 rounded-full"
                style={{
                  background: "radial-gradient(ellipse at center, var(--color-brand-400) 0%, var(--color-brand-500) 40%, transparent 70%)",
                  filter: "blur(90px)",
                }}
              />
              <div
                className="absolute top-1/2 left-[15%] -translate-x-1/2 -translate-y-1/2 w-[450px] h-[300px] opacity-25 dark:opacity-20 rounded-full"
                style={{
                  background: "radial-gradient(ellipse at center, var(--color-brand-400) 0%, transparent 70%)",
                  filter: "blur(70px)",
                }}
              />
              <div
                className="absolute top-1/2 left-[85%] -translate-x-1/2 -translate-y-1/2 w-[450px] h-[300px] opacity-25 dark:opacity-20 rounded-full"
                style={{
                  background: "radial-gradient(ellipse at center, var(--color-brand-600, var(--color-brand-500)) 0%, transparent 70%)",
                  filter: "blur(70px)",
                }}
              />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
              AI-Powered Analytics
            </div>
            <h1
              className="font-extrabold text-gray-900 dark:text-white tracking-tight mb-6"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", lineHeight: "1.08" }}
            >
              Smarter stock analysis,{" "}
              <br className="hidden sm:block" />
              <span className="text-brand-500">powered by AI</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Get real-time technical indicators, machine learning predictions, and sentiment analysis — all in one minimalist dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => router.push("/register")}
                className="w-full sm:w-auto px-9 py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all duration-300 hover:-translate-y-1 text-base"
              >
                Start Free &rarr;
              </button>
              <button
                onClick={() => router.push("/login")}
                className="w-full sm:w-auto px-9 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-xl transition-all duration-300 text-base"
              >
                Sign In
              </button>
            </div>
          </div>
        </section>

        {/* ─── Features section ─── */}
        <section className="px-4 max-w-6xl mx-auto mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              delay={300}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              }
              title="Interactive Charts"
              description="Beautiful, responsive charts with candlestick, line, and area views powered by Lightweight Charts."
            />
            <FeatureCard
              delay={400}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              }
              title="Smart Alerts"
              description="Set custom price alerts and get notified when your stocks hit key technical levels."
            />
            <FeatureCard
              delay={500}
              icon={
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
              title="Blazing Fast"
              description="Built with Rust for the backend and Next.js for the frontend — delivering sub-millisecond response times."
            />
          </div>
        </section>

        {/* ─── Creator section (Lanyard) ─── */}
        <section className="py-16 sm:py-24 overflow-hidden relative border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left Column: Creator Info */}
              <div className="space-y-8 z-10 relative">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-sm font-semibold mb-6">
                    ✨ Meet the Creator
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
                    Jonathan Lumban Batu
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg max-w-lg">
                    A passionate full-stack developer focused on building scalable, modern, and beautiful applications. Here are some of the tools I love working with:
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Frontend */}
                  <div>
                    <h3 
                      className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 flex items-center gap-2 cursor-pointer group hover:text-brand-500 transition-colors"
                      onClick={() => {
                        if (!frontendSkillsOpen) {
                          setFrontendSkillsOpen(true);
                          setShowPills(false);
                        } else {
                          setFrontendSkillsOpen(false);
                        }
                      }}
                    >
                      <span className={`w-6 h-px transition-all duration-300 ${frontendSkillsOpen ? 'w-10 bg-brand-500' : 'bg-brand-200 dark:bg-brand-500/30'}`}></span>
                      Frontend
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 transition-transform duration-300 ${frontendSkillsOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </h3>
                    
                    <CardNav 
                      isOpen={frontendSkillsOpen}
                      onCloseComplete={() => setShowPills(true)}
                      items={useMemo(() => [
                        {
                          label: "VueJs",
                          bgColor: "#42b883",
                          textColor: "#ffffff",
                          links: [
                            { label: "Vue Docs", href: "https://vuejs.org/" },
                            { label: "Ecosystem", href: "https://vuejs.org/ecosystem/" }
                          ]
                        },
                        {
                          label: "NextJs",
                          bgColor: "#000000",
                          textColor: "#ffffff",
                          links: [
                            { label: "Next Docs", href: "https://nextjs.org/" },
                            { label: "Showcase", href: "https://nextjs.org/showcase" }
                          ]
                        }
                      ], [])}
                    />
                  </div>
                  
                  {/* Backend */}
                  <div>
                    <h3 
                      className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 flex items-center gap-2 cursor-pointer group hover:text-brand-500 transition-colors"
                      onClick={() => {
                        if (!backendSkillsOpen) {
                          setBackendSkillsOpen(true);
                          setShowPills(false);
                        } else {
                          setBackendSkillsOpen(false);
                        }
                      }}
                    >
                      <span className={`w-6 h-px transition-all duration-300 ${backendSkillsOpen ? 'w-10 bg-brand-500' : 'bg-brand-200 dark:bg-brand-500/30'}`}></span>
                      Backend
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 transition-transform duration-300 ${backendSkillsOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </h3>
                    
                    <CardNav 
                      isOpen={backendSkillsOpen}
                      onCloseComplete={() => setShowPills(true)}
                      items={useMemo(() => [
                        {
                          label: "Express Js",
                          bgColor: "#333333",
                          textColor: "#ffffff",
                          links: [
                            { label: "Expressjs.com", href: "https://expressjs.com/" },
                            { label: "Guides", href: "https://expressjs.com/en/guide/routing.html" }
                          ]
                        },
                        {
                          label: "Laravel",
                          bgColor: "#FF2D20",
                          textColor: "#ffffff",
                          links: [
                            { label: "Laravel.com", href: "https://laravel.com/" },
                            { label: "V11 Docs", href: "https://laravel.com/docs/11.x" }
                          ]
                        },
                        {
                          label: "Golang",
                          bgColor: "#007D9C",
                          textColor: "#ffffff",
                          links: [
                            { label: "Go.dev", href: "https://go.dev/" },
                            { label: "Packages", href: "https://pkg.go.dev/" }
                          ]
                        },
                        {
                          label: "Rust",
                          bgColor: "#b7410e",
                          textColor: "#ffffff",
                          links: [
                            { label: "Rust-lang.org", href: "https://www.rust-lang.org/" },
                            { label: "Cargo", href: "https://doc.rust-lang.org/cargo/" }
                          ]
                        },
                        {
                          label: "Python",
                          bgColor: "#3776AB",
                          textColor: "#ffffff",
                          links: [
                            { label: "Python.org", href: "https://www.python.org/" },
                            { label: "PyPI", href: "https://pypi.org/" }
                          ]
                        }
                      ], [])}
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <h3 
                      className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3 flex items-center gap-2 cursor-pointer group hover:text-brand-500 transition-colors"
                      onClick={() => {
                        if (!mobileSkillsOpen) {
                          setMobileSkillsOpen(true);
                          setShowPills(false);
                        } else {
                          setMobileSkillsOpen(false);
                        }
                      }}
                    >
                      <span className={`w-6 h-px transition-all duration-300 ${mobileSkillsOpen ? 'w-10 bg-brand-500' : 'bg-brand-200 dark:bg-brand-500/30'}`}></span>
                      Mobile
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 transition-transform duration-300 ${mobileSkillsOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </h3>
                    
                    <CardNav 
                      isOpen={mobileSkillsOpen}
                      onCloseComplete={() => setShowPills(true)}
                      items={useMemo(() => [
                        {
                          label: "Flutter",
                          bgColor: "#02569B",
                          textColor: "#ffffff",
                          links: [
                            { label: "Flutter.dev", href: "https://flutter.dev/" },
                            { label: "Codelabs", href: "https://codelabs.developers.google.com/codelabs/flutter-codelab-first" }
                          ]
                        },
                        {
                          label: "React Native",
                          bgColor: "#61dbfb",
                          textColor: "#000000",
                          links: [
                            { label: "Reactnative.dev", href: "https://reactnative.dev/" },
                            { label: "Showcase", href: "https://reactnative.dev/showcase" }
                          ]
                        }
                      ], [])}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Lanyard 3D */}
              <div className="relative h-[450px] lg:h-[600px] w-full flex items-start justify-center z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-brand-400/40 dark:bg-brand-500/25 blur-[90px] rounded-full pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] bg-brand-500/25 dark:bg-brand-400/15 blur-[60px] rounded-full pointer-events-none" />
                <Lanyard position={[0, 0, 20]} gravity={[0, -40, 0]} />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tech stack ─── */}
        <section className="py-16 sm:py-20 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Built with modern technologies
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-10 max-w-md mx-auto">
              A robust full-stack architecture designed for performance and scalability.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: "Rust", sub: "Backend API", emoji: "🦀" },
                { name: "Next.js", sub: "Frontend", emoji: "⚡" },
                { name: "Python", sub: "AI Service", emoji: "🐍" },
                { name: "PostgreSQL", sub: "Database", emoji: "🐘" },
              ].map((tech) => (
                <div
                  key={tech.name}
                  className="flex flex-col items-center p-5 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 hover:border-brand-200 dark:hover:border-brand-500/30 transition-all duration-300"
                >
                  <span className="text-2xl mb-2">{tech.emoji}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{tech.name}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{tech.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA section ─── */}
        <section className="py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 p-8 sm:p-14 text-center overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Ready to start analyzing?
                </h2>
                <p className="text-sm sm:text-base text-brand-100 max-w-md mx-auto mb-8">
                  Join StockPulse and get access to real-time AI-powered stock analysis — completely free.
                </p>
                <Link
                  href="/register"
                  id="cta-signup-btn"
                  className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-brand-600 bg-white hover:bg-brand-50 rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  Create Free Account
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Footer ─── */}
        <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  StockPulse
                </span>
              </div>
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} StockPulse. Built with Rust, Next.js & AI.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
