import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import FilterTabsBar from "@/components/FilterTabsBar";
import ReportCard from "@/components/ReportCard";
import { reports } from "@/data/reports";
import { MessageCircle, X, Minus } from "lucide-react";

// ── Sostituisci con l'URL ottenuto da Copilot Studio → Canali → App Web ──
const COPILOT_IFRAME_URL = "https://copilotstudio.microsoft.com/environments/Default-2b8dac2b-9179-468b-9bd8-1fbf8bd844c7/bots/auto_agent_fT_Ih/webchat?__version__=2";

// ── Widget agente Copilot ─────────────────────────────────────────────────
const CopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {/* Pulsante floating — visibile quando chiuso */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3
                     rounded-full bg-primary text-primary-foreground shadow-lg
                     hover:opacity-90 transition-all"
          aria-label="Apri assistente virtuale"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">Web App Agent</span>
        </button>
      )}

      {/* Finestra chat */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[380px] bg-card rounded-2xl
                      shadow-2xl border border-border flex flex-col overflow-hidden
                      transition-all duration-200
                      ${isMinimized ? "h-[52px]" : "h-[600px]"}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          bg-primary text-primary-foreground shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Web App Agent</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                aria-label={isMinimized ? "Espandi" : "Minimizza"}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                aria-label="Chiudi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Iframe agente */}
          {!isMinimized && (
            <iframe
              src={COPILOT_IFRAME_URL}
              className="flex-1 w-full border-none"
              title="Web App Agent"
              allow="microphone"
            />
          )}
        </div>
      )}
    </>
  );
};

// ── Pagina principale ─────────────────────────────────────────────────────
const Index = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = useMemo(() => {
    let result = activeTab === "all" ? reports : reports.filter((r) => r.tag === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }
    return result;
  }, [activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
      <FilterTabsBar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium text-muted-foreground">No reports found</p>
            <p className="text-sm text-muted-foreground mt-1">
              There are no reports matching your criteria.
            </p>
          </div>
        )}
      </main>

      {/* Widget agente Copilot Studio */}
      <CopilotWidget />
    </div>
  );
};

export default Index;
