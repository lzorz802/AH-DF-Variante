import { ArrowUpRight, Settings, Database, Globe, LogOut, User, MessageCircle, X, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import digitalFactoryLogo from "@/assets/digital_factory_logo.png";
import heroBg from "@/assets/hero-bg.png";
import dashboardPreview from "@/assets/dashboard-preview.png";
import { useState } from "react";

const COPILOT_IFRAME_URL = "https://copilotstudio.microsoft.com/environments/Default-2b8dac2b-9179-468b-9bd8-1fbf8bd844c7/bots/auto_agent_fT_Ih/webchat?__version__=2";

const cards = [
  {
    title: "Reporting",
    subtitle: "Analisi delle prestazioni AI",
    icon: Settings,
    link: "/reports",
  },
  {
    title: "Data Architecture Overview",
    subtitle: "Panoramica su Dati e Architettura",
    icon: Database,
    link: "#",
  },
  {
    title: "Digital Products Analytics",
    subtitle: "Insights su prodotti digitali",
    icon: Globe,
    link: "#",
  },
];

const CopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3
                     rounded-full shadow-lg hover:opacity-90 transition-all"
          style={{ background: "#00AEEF", color: "#fff" }}
          aria-label="Apri assistente virtuale"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Web App Agent</span>
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[380px] rounded-2xl
                      shadow-2xl border border-white/10 flex flex-col overflow-hidden
                      transition-all duration-200
                      ${isMinimized ? "h-[52px]" : "h-[600px]"}`}
          style={{ background: "#0D1B6E" }}
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: "#00AEEF" }}>
            <div className="flex items-center gap-2 text-white">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Web App Agent</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded hover:bg-white/20 transition-colors text-white">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/20 transition-colors text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {!isMinimized && (
            <iframe src={COPILOT_IFRAME_URL} className="flex-1 w-full border-none"
              title="Web App Agent" allow="microphone" />
          )}
        </div>
      )}
    </>
  );
};

export default function Home() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: "#E8F0FE" }}>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: 420 }}>
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        {/* Overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(13,27,110,0.85) 0%, rgba(13,27,110,0.6) 100%)" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-12">
            <img src={digitalFactoryLogo} alt="KPMG Digital Factory" className="h-12 rounded-lg" />
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="hidden sm:block max-w-[160px] truncate">{user.email}</span>
                </div>
                <button onClick={signOut} title="Esci"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Esci</span>
                </button>
              </div>
            )}
          </div>

          {/* Hero text */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-3xl">
            Eccellenza digitale, dati, AI, UX
          </h1>
          <p className="mt-5 text-base md:text-lg text-white/80 max-w-3xl leading-relaxed">
            Centro di eccellenza che integra digitale, dati e AI per creare soluzioni scalabili.
            Trasforma bisogni di business in prodotti digitali ad alto impatto.
          </p>
        </div>
      </section>

      {/* Cards */}
      <section className="max-w-7xl mx-auto px-6 -mt-8 pb-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.title}
              to={card.link}
              className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "#1A2B8C",
                boxShadow: "0 8px 32px rgba(13,27,110,0.3)",
              }}
            >
              {/* Preview image */}
              <div className="p-4 pb-0">
                <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <img src={dashboardPreview} alt={card.title}
                    className="w-full h-44 object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {/* Content */}
              <div className="p-5 pt-4">
                <div className="flex items-start gap-3 mb-1">
                  <card.icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#00AEEF" }} />
                  <div>
                    <h3 className="text-base font-bold text-white leading-snug">{card.title}</h3>
                    <p className="text-sm text-white/50 mt-1">{card.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Arrow button */}
              <div className="px-5 pb-5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: "#0D1B6E", border: "2px solid rgba(255,255,255,0.15)" }}
                >
                  <ArrowUpRight className="h-5 w-5 text-white" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CopilotWidget />
    </div>
  );
}
