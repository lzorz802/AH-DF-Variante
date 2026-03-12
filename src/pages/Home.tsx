import { ArrowUpRight, Settings, Database, Globe, LogOut, User, Building2, BarChart3, Layout, Bot, Zap, Repeat, Shield, Rocket, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoClean from "@/assets/logo_digital_factory_clean.png";
import heroBg from "@/assets/hero-bg.png";
/* nuove immagini richieste */
import aiAgentImg from "@/assets/AI Agent.png";
import digitalChannelsImg from "@/assets/Digital Channels.png";
import buildingExperienceImg from "@/assets/Building Experience.png";
import aiEnhancedReportingImg from "@/assets/AI Enhanced Reporting.png";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const cards = [
  {
    title: "AI-enhanced reporting",
    subtitle: "Report intelligenti arricchiti dall'AI, con insight in tempo reale per decisioni più rapide.",
    icon: Settings,
    link: "/reports",
    image: aiEnhancedReportingImg, // sostituita
  },
  {
    title: "Soluzioni digitali innovative per la building experience",
    subtitle: "Strumenti digitali integrati per trasformare la gestione e la fruizione degli spazi.",
    icon: Database,
    link: "https://regionevenetobimsmartplatform.franchetti.tech/",
    image: buildingExperienceImg, // sostituita
  },
  {
    title: "Gestione integrata dei canali digitali",
    subtitle: "Monitora e ottimizza tutti i touchpoint digitali da un'unica piattaforma centralizzata.",
    icon: Globe,
    link: "https://regionevenetobimsmartplatform.franchetti.tech/",
    image: digitalChannelsImg, // sostituita
  },
];

const services = [
  {
    icon: Building2,
    title: "Soluzioni digitali per la building experience",
    description: "Ecosistemi integrati per la digitalizzazione degli edifici e dei servizi connessi.",
    image: buildingExperienceImg, // Building Experience.png
  },
  {
    icon: BarChart3,
    title: "AI-enhanced reporting",
    description: "Reportistica avanzata integrata con agenti conversazionali per l'interrogazione in linguaggio naturale.",
    image: aiEnhancedReportingImg, // AI Enhanced Reporting.png
  },
  {
    icon: Layout,
    title: "Gestione integrata dei canali digitali",
    description: "Ottimizzazione dei touchpoint digitali e web app multiservizio come entry point unificato.",
    image: digitalChannelsImg, // Digital Channels.png
  },
  {
    icon: Bot,
    title: "Agenti AI su misura",
    description: "Agenti di intelligenza artificiale personalizzati a supporto dell'efficientamento organizzativo.",
    image: aiAgentImg, // AI Agent.png
  },
];

const values = [
  { icon: Zap, label: "Scalabilità" },
  { icon: Repeat, label: "Riusabilità" },
  { icon: Shield, label: "Governance" },
  { icon: Rocket, label: "Velocità di delivery" },
  { icon: Users, label: "Multi-stakeholder" },
];

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

const HomeCard = ({ card }: { card: typeof cards[0] }) => {
  const isExternal = card.link.startsWith("http");

  if (isExternal) {
    return (
      <div
        onClick={() => window.open(card.link, "_blank", "noopener,noreferrer")}
        className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        style={{
          background: "#1A2B8C",
          boxShadow: "0 8px 32px rgba(13,27,110,0.3)",
          borderRadius: "1rem",
        }}
      >
        <div className="p-4 pb-0">
          <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <img
              src={card.image}
              alt={card.title}
              className="w-full h-64 object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
        <div className="p-5 pt-4 flex-1">
          <div className="flex items-start gap-3">
            <card.icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#00AEEF" }} />
            <div>
              <h3 className="text-base font-bold text-white leading-snug">{card.title}</h3>
              <p className="text-sm text-white/50 mt-1">{card.subtitle}</p>
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex justify-start">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <ArrowUpRight className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={card.link}
      className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        background: "#1A2B8C",
        boxShadow: "0 8px 32px rgba(13,27,110,0.3)",
        borderRadius: "1rem",
      }}
    >
      <div className="p-4 pb-0">
        <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <img
            src={card.image}
            alt={card.title}
            className="w-full h-64 object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
      <div className="p-5 pt-4 flex-1">
        <div className="flex items-start gap-3">
          <card.icon className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#00AEEF" }} />
          <div>
            <h3 className="text-base font-bold text-white leading-snug">{card.title}</h3>
            <p className="text-sm text-white/50 mt-1">{card.subtitle}</p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-5 flex justify-start">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: "rgba(255,255,255,0.15)" }}
        >
          <ArrowUpRight className="h-5 w-5 text-white" />
        </div>
      </div>
    </Link>
  );
};

export default function Home() {
  const { user, signOut } = useAuth();
  const intro = useInView();
  const servicesSection = useInView();
  const valuesSection = useInView();

  // number of services
  const nServices = services.length;

  // start centered on the second service (index 1)
  const startIndex = 1;

  // We'll use a "virtual" index on an extended array (3 copies) to create the infinite illusion.
  // extended length = 3 * nServices; the middle block is indices [nServices .. 2*nServices-1]
  const [virtualIndex, setVirtualIndex] = useState(nServices + startIndex);
  const virtualIndexRef = useRef(virtualIndex);
  useEffect(() => { virtualIndexRef.current = virtualIndex; }, [virtualIndex]);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [instantReset, setInstantReset] = useState(false);

  // Refs and sizing
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(820);
  const [itemWidth, setItemWidth] = useState<number>(300);
  const gap = 24;

  useEffect(() => {
    const computeSizes = () => {
      const vw = viewportRef.current?.clientWidth ?? window.innerWidth;
      const cw = Math.min(vw, 980);
      const iw = Math.min(420, Math.floor(cw * 0.32));
      setContainerWidth(cw);
      setItemWidth(iw);
    };
    computeSizes();
    window.addEventListener("resize", computeSizes);
    return () => window.removeEventListener("resize", computeSizes);
  }, []);

  // Build an extended array (3 copies)
  const extendedServices = [...services, ...services, ...services];

  // compute track X from virtualIndex (center the active item)
  const computeTrackX = (vIndex: number) => {
    const vw = viewportRef.current?.clientWidth ?? window.innerWidth;
    if (vw < 768) {
      const step = itemWidth + gap;
      const centerOffset = (vw / 2) - (itemWidth / 2);
      return -vIndex * step + centerOffset;
    }
    const step = itemWidth + gap;
    const centerOffset = containerWidth / 2 - itemWidth / 2;
    return -vIndex * step + centerOffset;
  };

  const trackX = computeTrackX(virtualIndex);

  // Handlers
  const goToVirtual = (newVirtualIndex: number) => {
    setInstantReset(false);
    setIsTransitioning(true);
    setVirtualIndex(newVirtualIndex);
  };

  const next = () => goToVirtual(virtualIndexRef.current + 1);
  const prev = () => goToVirtual(virtualIndexRef.current - 1);

  // After animation completes, if we're outside the middle block, snap back to the equivalent middle index
  const handleAnimationComplete = () => {
    if (!isTransitioning) return;
    const v = virtualIndexRef.current;
    // middle block range: [nServices, 2*nServices - 1]
    if (v < nServices || v >= 2 * nServices) {
      // compute equivalent index in middle block
      const logical = ((v % nServices) + nServices) % nServices; // 0..nServices-1
      const middleIndex = nServices + logical;
      // snap instantly to middleIndex
      setInstantReset(true); // will make transition duration 0 for the snap
      setVirtualIndex(middleIndex);
      // small timeout to clear instantReset and isTransitioning
      setTimeout(() => {
        setInstantReset(false);
        setIsTransitioning(false);
      }, 20);
    } else {
      // normal end of transition inside middle block
      setIsTransitioning(false);
    }
  };

  // expose current logical active service
  const activeLogicalIndex = ((virtualIndex - nServices) % nServices + nServices) % nServices;

  return (
    <div className="min-h-screen" style={{ background: "#E8F0FE" }}>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: 420 }}>
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(13,27,110,0.85) 0%, rgba(13,27,110,0.6) 100%)" }} />

        {/* aumentata max-width del titolo per evitare troppi wrap */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 flex flex-col items-center text-center">
          <div className="flex items-start justify-between mb-16 w-full">
            <img
              src={logoClean}
              alt="KPMG Digital Factory"
              style={{ width: "300px", height: "auto", transform: "scale(1.5)", transformOrigin: "center" }}
            />
          </div>

          {user && (
            <div className="absolute top-6 right-6 flex items-center gap-3">
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

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-5xl mb-8">
            Soluzioni digitali concrete ed innovative
            <br />
            per la Customer e la User Experience
          </h1>
          <div style={{ height: 18 }} />
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
      <section
        ref={intro.ref}
        className="py-20 px-6 relative overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0" style={{ background: "rgba(13,27,110,0.75)" }} />
        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={intro.visible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Cos'è la Digital Factory?
          </h2>
          <p className="text-lg text-white/75 leading-relaxed">
            La Digital Factory nasce all'interno del team customer KPMG come centro di eccellenza che combina competenze su
            tecnologie di frontiera, architetture dati, intelligenza artificiale e UX/UI design per creare soluzioni digitali
            innovative. Funziona come una fabbrica dell'innovazione, trasformando idee e bisogni concreti delle organizzazioni
            in prodotti digitali ad alto impatto.
          </p>
        </motion.div>
      </section>

      {/* Services: sliding carousel/track with animated translate (infinite illusion) */}
      <section ref={servicesSection.ref} className="py-20 px-6" style={{ background: "#E8F0FE" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={{ color: "#0D1B6E" }}>
            I Quattro Servizi
          </h2>

          <div className="relative flex flex-col items-center">
            {/* Viewport */}
            <div
              ref={viewportRef}
              className="w-full overflow-hidden"
              style={{ padding: "0 24px" }}
            >
              {/* Track: animated translateX */}
              <motion.div
                animate={{ x: trackX }}
                transition={instantReset ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 20 }}
                onAnimationComplete={handleAnimationComplete}
                className="flex items-center"
                style={{
                  gap: gap,
                  width: extendedServices.length * (itemWidth + gap),
                  padding: "28px 0",
                }}
              >
                {extendedServices.map((svc, idx) => {
                  const isActive = idx === virtualIndex;
                  const vw = viewportRef.current?.clientWidth ?? window.innerWidth;
                  const isMobile = vw < 768;
                  const baseW = isMobile ? Math.min(480, vw) : itemWidth;
                  const height = isMobile ? 260 : (isActive ? 320 : 180);
                  const scale = isActive ? 1.06 : 0.92;
                  const z = isActive ? 30 : 10;
                  return (
                    <div
                      key={`ext-${idx}`}
                      className="rounded-2xl overflow-hidden border flex-shrink-0 transition-transform"
                      style={{
                        width: baseW,
                        height,
                        transform: `scale(${scale})`,
                        background: "#fff",
                        borderColor: isActive ? "rgba(0,174,239,0.15)" : "rgba(0,174,239,0.06)",
                        boxShadow: isActive ? "0 20px 40px rgba(13,27,110,0.12)" : "0 6px 18px rgba(13,27,110,0.06)",
                        zIndex: z,
                        overflow: "hidden",
                      }}
                    >
                      <img
                        src={svc.image}
                        alt={svc.title}
                        className="w-full h-full object-cover object-top"
                        style={{ display: "block" }}
                      />
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* Under the images, title + description of center service (logical index) */}
            <div className="mt-6 text-center max-w-2xl">
              <h3 className="text-lg md:text-xl font-bold" style={{ color: "#0D1B6E" }}>
                {services[activeLogicalIndex].title}
              </h3>
              <p className="text-sm mt-2" style={{ color: "#4A5568" }}>
                {services[activeLogicalIndex].description}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mt-8">
              <button
                onClick={() => { prev(); }}
                aria-label="Precedente"
                className="w-12 h-12 rounded-full flex items-center justify-center border hover:shadow-md transition"
                style={{ borderColor: "rgba(13,27,110,0.08)", background: "white" }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex gap-2 items-center">
                {services.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const targetVirtual = nServices + idx;
                      goToVirtual(targetVirtual);
                    }}
                    aria-label={`Vai al servizio ${idx + 1}`}
                    className={`w-2 h-2 rounded-full transition-all ${idx === activeLogicalIndex ? "scale-110" : "opacity-50"}`}
                    style={{ background: idx === activeLogicalIndex ? "#0D1B6E" : "#A0AEC0" }}
                  />
                ))}
              </div>

              <button
                onClick={() => { next(); }}
                aria-label="Successivo"
                className="w-12 h-12 rounded-full flex items-center justify-center border hover:shadow-md transition"
                style={{ borderColor: "rgba(13,27,110,0.08)", background: "white" }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
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
