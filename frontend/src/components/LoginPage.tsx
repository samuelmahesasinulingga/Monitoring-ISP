import React, { useState } from "react";

type LoginPageProps = {
  onLoginSuccess: () => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("admin@isp.co.id");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    try {
      const res = await fetch(`${apiBase}/api/login`, {
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

      // Optional: bisa baca role/email dari response jika ingin dibedakan.
      // const data = await res.json();
      onLoginSuccess();
    } catch (err) {
      console.error("login error", err);
      setError("Tidak dapat menghubungi server login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-slate-50 to-indigo-100 text-slate-900 px-4">
      <div className="w-full max-w-4xl bg-white/95 rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6">
        <div className="flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 mb-4 w-fit text-[11px] text-slate-500">
            <span className="text-xs">📡</span>
            <span className="font-medium tracking-wide">ISP Monitoring &amp; Billing Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-2 leading-snug">
            Selamat datang di panel<br className="hidden sm:block" /> administrasi ISP Anda
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mb-4 max-w-md">
            Pantau kualitas jaringan, SLA, dan aktivitas pelanggan dalam satu panel terpusat.
            Gunakan akun Super Admin atau Admin Workspace untuk melanjutkan.
          </p>
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500 mt-2">
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
              <span>Multi-workspace</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-5 md:px-6 md:py-6 shadow-lg shadow-slate-900/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-blue-50 text-xl">
              🔐
            </div>
            <div>
              <h2 className="m-0 text-base font-semibold text-slate-900">
                Masuk ke akun Anda
              </h2>
              <p className="m-0 mt-0.5 text-[11px] text-slate-500">
                Akses dibatasi untuk user internal ISP.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="email"
              className="block text-[11px] mb-1.5 font-medium text-slate-600"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.co.id"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 placeholder:text-slate-300"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="flex items-center justify-between text-[11px] mb-1.5 font-medium text-slate-600"
            >
              <span>Password</span>
              <span className="text-[10px] opacity-70">Minimal 6 karakter</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 placeholder:text-slate-300"
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

          <div className="mt-3 text-[11px] text-slate-500 border-t border-dashed border-slate-200 pt-2.5 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-600">Akun default (database)</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400 border border-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Hanya untuk pengujian awal</span>
              </span>
            </div>
            <p className="m-0">
              <span className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 mr-1">
                admin@isp.co.id
              </span>
              <span className="font-mono text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">
                admin123
              </span>
            </p>
            <p className="m-0 text-[10px] text-slate-400">
              Akun ini dibuat di tabel <code>admins</code> database PostgreSQL
              melalui skrip inisialisasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
