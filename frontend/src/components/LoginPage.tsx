import React, { useState } from "react";

type LoginPageProps = {
  onLoginSuccess: () => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("admin@isp.co.id");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const validEmail = "admin@isp.co.id";
    const validPassword = "admin123";

    setTimeout(() => {
      if (email === validEmail && password === validPassword) {
        onLoginSuccess();
      } else {
        setError("Email atau password tidak sesuai (dummy credential).");
      }
      setIsSubmitting(false);
    }, 400);
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #e0f2fe 0, #f9fafb 40%, #eef2ff 100%)",
        color: "#111827",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.98)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 24px 80px rgba(15,23,42,0.18)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ fontSize: 26, marginBottom: 8 }}>🔐</div>
        <h2
          style={{
            margin: 0,
            marginBottom: 4,
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          Masuk ke akun Anda
        </h2>
        <p
          style={{
            margin: 0,
            marginBottom: 14,
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          Gunakan credential Super Admin atau Admin Workspace. Hak akses akan
          mengikuti role user di backend.
        </p>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 12,
                marginBottom: 4,
                color: "#9ca3af",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.co.id"
              style={{
                width: "100%",
                padding: "9px 11px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                background: "#ffffff",
                color: "#111827",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                marginBottom: 4,
                color: "#9ca3af",
              }}
            >
              <span>Password</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>
                Minimal 6 karakter
              </span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 11px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                background: "#ffffff",
                color: "#111827",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginTop: 4,
                padding: 8,
                borderRadius: 10,
                background: "#fef2f2",
                color: "#b91c1c",
                fontSize: 12,
                border: "1px solid #fecaca",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: 4,
              padding: "9px 14px",
              borderRadius: 999,
              border: "none",
              background: isSubmitting ? "#93c5fd" : "#2563eb",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: isSubmitting ? "default" : "pointer",
              boxShadow: isSubmitting
                ? "0 0 0 rgba(37,99,235,0.2)"
                : "0 10px 25px rgba(37,99,235,0.35)",
            }}
          >
            {isSubmitting ? "Memproses..." : "Login"}
          </button>
        </form>

        <p
          style={{
            margin: "12px 0 0",
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          Dummy credential sementara: <strong>admin@isp.co.id</strong> /
          <strong>admin123</strong>. Nanti akan diganti dengan validasi ke
          backend dan role user.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
