import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Minus, X, Send, Loader2 } from "lucide-react";
import aiAssistantAvatar from "@/assets/kpmg_df_ai_assistant.png";

const N8N_WEBHOOK_URL =
  "https://gsprst.app.n8n.cloud/webhook/d64d1e05-43ca-45f0-a660-86fcb79d87bd/chat";

// Genera un sessionId unico per questa sessione browser (lazy, dentro il componente)
function generateSessionId() {
  return "session-" + Math.random().toString(36).slice(2) + Date.now();
}

interface Message {
  role: "user" | "assistant";
  text: string;
}

// Estrae in modo sicuro una stringa dalla risposta n8n,
// qualunque sia la struttura restituita.
function extractReply(data: unknown): string {
  if (!data || typeof data !== "object") return "Risposta non disponibile.";

  const d = data as Record<string, unknown>;

  // n8n chatTrigger può restituire array o oggetto
  const raw =
    d?.output ??
    d?.text ??
    d?.message ??
    d?.response ??
    (Array.isArray(d) ? (d as unknown[])[0] : undefined);

  if (raw === null || raw === undefined) return "Risposta non disponibile.";

  // Se è già una stringa, perfetto
  if (typeof raw === "string") return raw.trim() || "Risposta non disponibile.";

  // Se è un oggetto, prova a estrarne il testo
  if (typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const nested = r?.output ?? r?.text ?? r?.message ?? r?.response ?? r?.content;
    if (typeof nested === "string") return nested.trim() || "Risposta non disponibile.";
    // Ultimo fallback: JSON stringify per non crashare React
    try {
      return JSON.stringify(raw);
    } catch {
      return "Risposta non disponibile.";
    }
  }

  return String(raw);
}

export const GlobalCopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Ciao! Sono il tuo assistente AI. Chiedimi qualsiasi cosa sui dati CEE.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();

  // SessionId per-istanza del componente (non a livello di modulo)
  const sessionIdRef = useRef<string>(generateSessionId());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && !isCollapsed) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isCollapsed]);

  if (
    location.pathname === "/login" ||
    location.pathname === "/reset-password"
  )
    return null;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsLoading(true);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatInput: text,
          sessionId: sessionIdRef.current,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: unknown = await res.json();
      const reply = extractReply(data);

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "⚠️ Errore di connessione. Controlla che il workflow n8n sia attivo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button — visible when chat is closed OR collapsed */}
      {(!isOpen || isCollapsed) && (
        <div
          className="fixed bottom-10 right-6 z-[9999]"
          style={{
            width: isCollapsed ? "48px" : "144px",
            height: isCollapsed ? "48px" : "144px",
            transition: "width 0.3s ease, height 0.3s ease",
          }}
        >
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10"
              style={{
                background: "#0D1B6E",
                border: "1px solid rgba(0,174,239,0.5)",
              }}
              title="Riduci"
            >
              <Minus className="h-3 w-3 text-white" />
            </button>
          )}

          <button
            onClick={() => {
              if (isCollapsed) {
                setIsCollapsed(false);
              } else {
                setIsOpen(true);
              }
            }}
            className="rounded-full shadow-lg hover:scale-105 overflow-hidden border-2 absolute"
            style={{
              borderColor: "#00AEEF",
              width: isCollapsed ? "48px" : "144px",
              height: isCollapsed ? "48px" : "144px",
              bottom: 0,
              right: 0,
              transition: "width 0.3s ease, height 0.3s ease",
            }}
            aria-label="Apri assistente virtuale"
          >
            <img
              src={aiAssistantAvatar}
              alt="AI Assistant"
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      )}

      {/* Chat window */}
      {isOpen && !isCollapsed && (
        <div
          className="fixed bottom-10 right-6 z-[9999] w-[360px] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            background: "#0D1B6E",
            border: "1px solid rgba(0,174,239,0.3)",
            height: "520px",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{ background: "#0D1B6E", height: "56px" }}
          >
            <div className="flex items-center gap-2.5">
              <img
                src={aiAssistantAvatar}
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <div>
                <span className="text-sm font-semibold text-white block leading-tight">
                  KPMG Digital Factory AI
                </span>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Online
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCollapsed(true);
                }}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-white"
                title="Riduci a icona"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCollapsed(false);
                }}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-white"
                title="Chiudi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            style={{ background: "#080E3A" }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <img
                    src={aiAssistantAvatar}
                    alt=""
                    className="w-6 h-6 rounded-full shrink-0 mt-0.5"
                  />
                )}
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                  style={
                    msg.role === "user"
                      ? {
                          background: "#00AEEF",
                          color: "#fff",
                          borderBottomRightRadius: "4px",
                        }
                      : {
                          background: "rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.9)",
                          borderBottomLeftRadius: "4px",
                          border: "1px solid rgba(0,174,239,0.15)",
                        }
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Loading bubble */}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <img
                  src={aiAssistantAvatar}
                  alt=""
                  className="w-6 h-6 rounded-full shrink-0 mt-0.5"
                />
                <div
                  className="px-3 py-2 rounded-2xl flex items-center gap-1.5"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(0,174,239,0.15)",
                    borderBottomLeftRadius: "4px",
                  }}
                >
                  <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                  <span className="text-xs text-white/50">Elaborazione...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div
            className="px-3 py-3 flex items-center gap-2 shrink-0"
            style={{
              background: "#0D1B6E",
              borderTop: "1px solid rgba(0,174,239,0.2)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio..."
              disabled={isLoading}
              className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(0,174,239,0.25)",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
              style={{ background: "#00AEEF" }}
              title="Invia"
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
