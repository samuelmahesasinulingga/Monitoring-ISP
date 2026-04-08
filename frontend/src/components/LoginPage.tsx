import React, { useState } from "react";

type LoginPageProps = {
  onLoginSuccess: (payload: {
    email: string;
    role: string;
    workspaceId?: number | null;
    workspaceName?: string | null;
    workspaceAddress?: string | null;
  }) => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
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
        email: data.email,
        role: data.role,
        workspaceId: data.workspaceId ?? null,
        workspaceName: data.workspaceName ?? null,
        workspaceAddress: data.workspaceAddress ?? null,
      });
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
              placeholder="Masukkan email anda"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 placeholder:text-slate-300"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="flex items-center justify-between text-[11px] mb-1.5 font-medium text-slate-600"
            >
              <span>Password</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password anda"
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
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
