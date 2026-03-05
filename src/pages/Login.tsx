import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import kpmgLogo from "@/assets/kpmg-logo.png";

export default function Login() {
  const { user, isLoading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (!isLoading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const { error } = await signIn(email.trim(), password);
    if (error) setError(error);
    setIsPending(false);
  };

  return (
    <div className="min-h-screen bg-[#00205b] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 60px, white 60px, white 61px), repeating-linear-gradient(90deg, transparent, transparent 60px, white 60px, white 61px)` }} />
      <div className="absolute top-[-180px] right-[-180px] w-[480px] h-[480px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, #0091DA 0%, transparent 70%)" }} />
      <div className="absolute bottom-[-120px] left-[-120px] w-[360px] h-[360px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, #00B4F0 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
        <div className="px-8 pt-10 pb-8 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <img src={kpmgLogo} alt="KPMG" className="h-9 mx-auto mb-6" style={{ filter: "brightness(0) invert(1)" }} />
          <h1 className="text-2xl font-semibold text-white tracking-tight">Analytics Portal</h1>
          <p className="text-sm text-white/45 mt-1.5">Accedi con le tue credenziali @kpmg.it</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-red-300 leading-snug">{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-widest">Email aziendale</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome.cognome@kpmg.it"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(0,145,218,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,145,218,0.15)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(0,145,218,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,145,218,0.15)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isPending}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #0091DA 0%, #0068A5 100%)", boxShadow: "0 4px 20px rgba(0,145,218,0.35)" }}>
            {isPending ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Accesso in corso…</>) : "Accedi"}
          </button>

          <p className="text-center text-xs text-white/25 leading-relaxed pt-1">
            L'accesso è riservato ai dipendenti KPMG Italia.<br />Per assistenza contatta il supporto IT.
          </p>
        </form>
      </div>
      <p className="absolute bottom-5 text-center w-full text-xs text-white/20">© {new Date().getFullYear()} KPMG Advisory S.p.A. · Uso interno riservato</p>
    </div>
  );
}
