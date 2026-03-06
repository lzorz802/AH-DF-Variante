import { ArrowUpRight, Settings, Database, Globe, LogOut, User, Building2, BarChart3, Layout, Bot, Zap, Repeat, Shield, Rocket, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoClean from "@/assets/logo_digital_factory_clean.png";
import heroBg from "@/assets/hero-bg.png";
import dashboardPreview from "@/assets/dashboard-preview.png";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

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

const services = [
  {
    icon: Building2,
    title: "Soluzioni digitali per la building experience",
    description: "Ecosistemi integrati per la digitalizzazione degli edifici e dei servizi connessi.",
  },
  {
    icon: BarChart3,
    title: "AI-enhanced reporting",
    description: "Reportistica avanzata integrata con agenti conversazionali per l'interrogazione in linguaggio naturale.",
  },
  {
    icon: Layout,
    title: "Gestione integrata dei canali digitali",
    description: "Ottimizzazione dei touchpoint digitali e web app multiservizio come entry point unificato.",
  },
  {
    icon: Bot,
    title: "Agenti AI su misura",
    description: "Agenti di intelligenza artificiale personalizzati a supporto dell'efficientamento organizzativo.",
  },
];

const values = [
  { icon: Zap, label: "Scalabilità" },
  { icon: Repeat, label: "Riusabilità" },
  { icon: Shield, label: "Governance" },
  { icon: Rocket, label: "Velocità di delivery" },
  { icon: Users, label: "Multi-stakeholder" },
];

/* ── Scroll animation hook ───────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Home Card ────────────────────────────────────────────────── */
const HomeCard = ({ card }: { card: typeof cards[0] }) => {
  return (
    <Link
      to={card.link}
      className="group rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "#1A2B8C",
        boxShadow: "0 8px 32px rgba(13,27,110,0.3)",
      }}
    >
      <div className="p-4 pb-0">
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <img src={dashboardPreview} alt={card.title}
            className="w-full h-44 object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="p-5 pt-4">
        <div className="flex items-start gap-3 mb-1">
          <card.icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#00AEEF" }} />
          <div>
            <h3 className="text-base font-bold text-white leading-snug">{card.title}</h3>
            <p className="text-sm text-white/50 mt-1">{card.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: "#0D1B6E", border: "2px solid rgba(255,255,255,0.15)" }}
        >
          <ArrowUpRight className="h-5 w-5 text-white" />
        </div>
      </div>
    </Link>
  );
};

/* ── Main Page ───────────────────────────────────────────────── */
export default function Home() {
  const { user, signOut } = useAuth();
  const intro = useInView();
  const servicesSection = useInView();
  const valuesSection = useInView();

  return (
    <div className="min-h-screen" style={{ background: "#E8F0FE" }}>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: 600 }}>
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(13,27,110,0.85) 0%, rgba(13,27,110,0.6) 100%)" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-4 pb-16">
          {/* Top bar */}
          <div className="flex items-start justify-between mb-6">
            <img src={logoClean} alt="KPMG Digital Factory" style={{ height: "128px", width: "auto" }} />
            {user && (
              <div className="flex items-center gap-3 mt-4">
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
            <HomeCard key={card.title} card={card} />
          ))}
        </div>
      </section>

      {/* Intro */}
      <section ref={intro.ref} className="py-20 px-6" style={{ background: "#0D1B6E" }}>
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={intro.visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Cos'è la Digital Factory?
          </h2>
          <p className="text-lg text-white/75 leading-relaxed">
            La Digital Factory è un centro di eccellenza KPMG che combina competenze su tecnologie digitali,
            architetture dati, intelligenza artificiale e UX/UI design per creare soluzioni digitali scalabili.
            Funziona come una fabbrica dell'innovazione, trasformando idee e bisogni concreti delle organizzazioni
            in prodotti digitali ad alto impatto.
          </p>
        </motion.div>
      </section>

      {/* Services */}
      <section ref={servicesSection.ref} className="py-20 px-6" style={{ background: "#E8F0FE" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12" style={{ color: "#0D1B6E" }}>
            I Quattro Servizi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((svc, i) => (
              <motion.div
                key={svc.title}
                className="rounded-2xl p-6 border"
                style={{ background: "#fff", borderColor: "rgba(0,174,239,0.15)" }}
                initial={{ opacity: 0, y: 30 }}
                animate={servicesSection.visible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(0,174,239,0.1)" }}>
                  <svc.icon className="h-5 w-5" style={{ color: "#00AEEF" }} />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: "#0D1B6E" }}>{svc.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#4A5568" }}>{svc.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values strip */}
      <section ref={valuesSection.ref} className="py-14 px-6" style={{ background: "#0D1B6E" }}>
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-8">
          {values.map((v, i) => (
            <motion.div
              key={v.label}
              className="flex items-center gap-2.5"
              initial={{ opacity: 0, x: -20 }}
              animate={valuesSection.visible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(0,174,239,0.15)" }}>
                <v.icon className="h-4 w-4" style={{ color: "#00AEEF" }} />
              </div>
              <span className="text-sm font-medium text-white">{v.label}</span>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
