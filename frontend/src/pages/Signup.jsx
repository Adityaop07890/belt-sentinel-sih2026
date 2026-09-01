import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AuthLayout } from "@/pages/Login";
import { UserPlus, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(""); setMsg("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    if (data.session) {
      // auto-confirm enabled — session available immediately
      navigate("/dashboard", { replace: true });
    } else {
      setMsg("Account created. Please check your email to confirm before signing in.");
    }
  }

  return (
    <AuthLayout title="REQUEST ACCESS" subtitle="Belt-Sentinel HMI · SIH 2026">
      <form onSubmit={submit} className="space-y-4" data-testid="signup-form">
        {err && (
          <div className="border border-[#FF3333] text-[#FF3333] text-[12px] font-mono px-3 py-2 flex items-center gap-2" data-testid="signup-error">
            <AlertTriangle size={14} /> {err}
          </div>
        )}
        {msg && (
          <div className="border border-[#4A90E2] text-[#4A90E2] text-[12px] font-mono px-3 py-2 flex items-center gap-2" data-testid="signup-message">
            <CheckCircle2 size={14} /> {msg}
          </div>
        )}
        <FieldInput label="EMAIL" type="email" value={email} onChange={setEmail} testid="signup-email" />
        <FieldInput label="PASSWORD (min 6 chars)" type="password" value={password} onChange={setPassword} testid="signup-password" minLength={6} />
        <button
          type="submit"
          disabled={busy}
          data-testid="signup-submit"
          className="w-full inline-flex items-center justify-center gap-2 border border-[#5A6063] hover:border-[#E2E2E2] hover:bg-[#252729] text-[#E2E2E2] py-2 text-[12px] font-mono tracking-widest disabled:opacity-50"
        >
          <UserPlus size={14} />
          {busy ? "CREATING..." : "REQUEST ACCESS"}
        </button>
      </form>
      <div className="mt-6 pt-4 border-t border-[#252729] text-center text-[11px] font-mono text-[#757575]">
        ALREADY HAVE ACCESS?{" "}
        <Link to="/login" className="text-[#4A90E2] hover:text-[#E2E2E2]" data-testid="signup-to-login">
          SIGN IN
        </Link>
      </div>
    </AuthLayout>
  );
}

function FieldInput({ label, type, value, onChange, testid, minLength }) {
  return (
    <label className="block">
      <span className="text-[11px] font-mono tracking-[0.15em] text-[#A0A0A0]">{label}</span>
      <input
        type={type}
        required
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        autoComplete={type === "password" ? "new-password" : "email"}
        className="mt-1 w-full bg-[#121416] border border-[#3A3E41] focus:border-[#5A6063] focus:outline-none px-3 py-2 text-[13px] text-[#E2E2E2] font-mono"
      />
    </label>
  );
}
