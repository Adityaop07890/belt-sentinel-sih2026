import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { HardHat, LogIn, AlertTriangle } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      const raw = error.message || "";
      const lower = raw.toLowerCase();
      let friendly = raw;
      if (lower.includes("email not confirmed")) {
        friendly = "This email hasn't been confirmed yet. Ask your Supabase admin to disable 'Confirm email' or run the confirm-user SQL, then retry.";
      } else if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
        friendly = "Invalid email or password. If you just signed up, your account may need to be confirmed in Supabase (Auth → Email → 'Confirm email' OFF, or SQL: update auth.users set email_confirmed_at=now() where email='...'). Otherwise create an account via Request Access.";
      }
      return setErr(friendly);
    }
    navigate(dest, { replace: true });
  }

  return (
    <AuthLayout title="OPERATOR SIGN-IN" subtitle="Belt-Sentinel HMI · SIH 2026">
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        {err && (
          <div className="border border-[#FF3333] text-[#FF3333] text-[12px] font-mono px-3 py-2 flex items-center gap-2" data-testid="login-error">
            <AlertTriangle size={14} /> {err}
          </div>
        )}
        <Field label="EMAIL" type="email" value={email} onChange={setEmail} testid="login-email" />
        <Field label="PASSWORD" type="password" value={password} onChange={setPassword} testid="login-password" />
        <button
          type="submit"
          disabled={busy}
          data-testid="login-submit"
          className="w-full inline-flex items-center justify-center gap-2 border border-[#5A6063] hover:border-[#E2E2E2] hover:bg-[#252729] text-[#E2E2E2] py-2 text-[12px] font-mono tracking-widest disabled:opacity-50"
        >
          <LogIn size={14} />
          {busy ? "AUTHENTICATING..." : "SIGN IN"}
        </button>
      </form>
      <div className="mt-6 pt-4 border-t border-[#252729] text-center text-[11px] font-mono text-[#757575]">
        NO ACCOUNT?{" "}
        <Link to="/signup" className="text-[#4A90E2] hover:text-[#E2E2E2]" data-testid="login-to-signup">
          REQUEST ACCESS
        </Link>
      </div>
    </AuthLayout>
  );
}

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-[#121416] grain-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-[#252729] bg-[#1A1C1E] p-6 relative">
        <div className="absolute -top-3 left-4 bg-[#121416] px-2 text-[10px] font-mono tracking-[0.3em] text-[#A0A0A0]">
          PS-26008 · CLASSIFIED
        </div>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 grid place-items-center bg-[#252729] border border-[#3A3E41]">
            <HardHat size={16} className="text-[#A0A0A0]" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-[#E2E2E2] tracking-wide">{title}</div>
            <div className="text-[10px] font-mono text-[#757575]">{subtitle}</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, testid }) {
  return (
    <label className="block">
      <span className="text-[11px] font-mono tracking-[0.15em] text-[#A0A0A0]">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        autoComplete={type === "password" ? "current-password" : "email"}
        className="mt-1 w-full bg-[#121416] border border-[#3A3E41] focus:border-[#5A6063] focus:outline-none px-3 py-2 text-[13px] text-[#E2E2E2] font-mono"
      />
    </label>
  );
}
