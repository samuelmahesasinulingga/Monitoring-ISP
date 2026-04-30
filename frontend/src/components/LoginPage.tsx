import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";

type LoginPageProps = {
  onLoginSuccess: (payload: {
    email: string;
    role: string;
    workspaceId?: number | null;
    workspaceName?: string | null;
    workspaceAddress?: string | null;
    id?: number;
  }) => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const msg = res.status === 401
          ? "Email atau password tidak sesuai."
          : "Login gagal, coba lagi sebentar lagi.";
        setError(msg);
        return;
      }

      const data = await res.json();
      onLoginSuccess({
        email: data.email || data.username || "",
        role: data.role,
        workspaceId: data.workspaceId ?? null,
        workspaceName: data.workspaceName ?? null,
        workspaceAddress: data.workspaceAddress ?? null,
        id: data.id,
      });
    } catch (err) {
      console.error("login error", err);
      setError("Tidak dapat menghubungi server login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-[#020617] text-slate-100' : 'bg-gradient-to-br from-sky-100 via-slate-50 to-indigo-100 text-slate-900'} px-4 relative`}>
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl bg-[var(--card-main-bg)] text-[var(--text-main-primary)] hover:opacity-80 transition-all flex items-center justify-center border border-[var(--border-main)] shadow-xl"
        >
          {theme === 'dark' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="w-full max-w-4xl bg-[var(--card-main-bg)] hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 border border-[var(--border-main)] shadow-lg rounded-3xl p-6 md:p-8 grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6">
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-main)] bg-[var(--border-main)] px-3 py-1 mb-4 w-fit text-[11px] text-[var(--text-main-secondary)]">
            <span className="text-xs">📡</span>
            <span className="font-medium tracking-wide">ISP Monitoring &amp; Billing Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-main-primary)] mb-2 leading-snug">
            Selamat datang di panel<br className="hidden sm:block" /> administrasi ISP Anda
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-main-secondary)] mb-4 max-w-md">
            Pantau kualitas jaringan, SLA, dan aktivitas pelanggan dalam satu panel terpusat.
            Silakan masuk untuk melanjutkan ke dashboard Anda.
          </p>
          <div className="hidden md:flex items-center gap-3 text-[11px] text-[var(--text-main-secondary)] mt-2">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Realtime monitoring</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span>SLA dashboard</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>Manajemen terpusat</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--card-main-bg)] hover:-translate-y-1 transition-all duration-300 shadow-lg px-5 py-5 md:px-6 md:py-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-blue-600/10 text-xl">
              🔐
            </div>
            <div>
              <h2 className="m-0 text-base font-semibold text-[var(--text-main-primary)]">
                Masuk ke akun Anda
              </h2>
              <p className="m-0 mt-0.5 text-[11px] text-[var(--text-main-secondary)]">
                Akses dibatasi untuk user internal ISP.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] mb-1.5 font-medium text-[var(--text-main-secondary)]"
            >
              Email / Username
            </label>
            <input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email anda"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-main)] text-xs md:text-sm bg-[var(--bg-main)] text-[var(--text-main-primary)] outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="flex items-center justify-between text-[11px] mb-1.5 font-medium text-[var(--text-main-secondary)]"
            >
              <span>Password</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password anda"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-main)] text-xs md:text-sm bg-[var(--bg-main)] text-[var(--text-main-primary)] outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 placeholder:text-slate-400"
            />
          </div>

          {error && (
            <div className="mt-0.5 px-3 py-2 rounded-xl bg-red-50 text-red-700 text-[11px] border border-red-200 flex items-start gap-2">
              <span className="mt-0.5 text-xs">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-1.5 px-4 py-2.5 rounded-full border-0 text-white text-xs md:text-sm font-semibold shadow-lg transition-all ${
              isSubmitting
                ? "bg-blue-300 cursor-default shadow-none"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-500/40"
            }`}
          >
            {isSubmitting ? "Memproses..." : "Login"}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
