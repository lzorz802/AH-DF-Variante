import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Lock } from "lucide-react";
import kpmgLogo from "@/assets/digital_factory_logo.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase invia il token nell'hash dell'URL: #access_token=...&type=recovery
    // Dobbiamo farlo processare a Supabase prima di poter aggiornare la password
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setSessionReady(true);
        setError(null);
      } else if (!session) {
        setError("Link non valido o scaduto. Richiedi un nuovo link di reset.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sessionReady) {
      setError("Sessione non pronta. Assicurati di aver cliccato il link dall'email.");
      return;
    }
    if (password !== confirm) {
      setError("Le password non coincidono.");
      return;
    }
    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri.");
      return;
    }

    setIsPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setMessage("✅ Password aggiornata! Verrai reindirizzato al login...");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 2500);
    }
    setIsPending(false);
  };

  return (
    <div className="min-h-screen bg-[#00205b] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 60px, white 60px, white 61px), repeating-linear-gradient(90deg, transparent, transparent 60px, white 60px, white 61px)` }} />
      <div className="absolute top-[-180px] right-[-180px] w-[480px] h-[480px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, #0091DA 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
        <div className="px-8 pt-10 pb-8 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <img src={kpmgLogo} alt="KPMG Digital Factory" className="w-full max-w-[260px] mx-auto mb-6 rounded-lg" />
          <h1 className="text-2xl font-semibold text-white tracking-tight">Nuova password</h1>
          <p className="text-sm text-white/45 mt-1.5">Scegli una nuova password per il tuo account</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-5">
          {/* Stato sessione */}
          {!sessionReady && !error && !message && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(0,145,218,0.12)", border: "1px solid rgba(0,145,218,0.25)" }}>
              <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin shrink-0" />
              <span className="text-blue-300">Verifica del link in corso...</span>
            </div>
          )}

          {sessionReady && !message && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <span className="text-green-300">✅ Link verificato. Inserisci la nuova password.</span>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <span className="text-red-300 leading-snug">{error}</span>
            </div>
          )}

          {message && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <span className="text-green-300 leading-snug">{message}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-widest">Nuova password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(0,145,218,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,145,218,0.15)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-widest">Conferma password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/20 outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
                onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(0,145,218,0.6)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,145,218,0.15)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.10)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>

          <button type="submit" disabled={isPending || !sessionReady}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #0091DA 0%, #0068A5 100%)", boxShadow: "0 4px 20px rgba(0,145,218,0.35)" }}>
            {isPending ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Aggiornamento…</>) : "Aggiorna password"}
          </button>
        </form>
      </div>
      <p className="absolute bottom-5 text-center w-full text-xs text-white/20">© {new Date().getFullYear()} KPMG Advisory S.p.A. · Uso interno riservato</p>
    </div>
  );
}
