import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const ALLOWED_DOMAIN = "kpmg.it";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !session.user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !session.user.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`)) {
      return { error: `Accesso consentito solo agli utenti con email @${ALLOWED_DOMAIN}.` };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login credentials")) return { error: "Email o password errati. Riprova." };
      if (error.message.includes("Email not confirmed")) return { error: "Conferma la tua email prima di accedere." };
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://digitalfactoryweb.it/reset-password`,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
