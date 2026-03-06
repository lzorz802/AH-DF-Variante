import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Minus, X, MessageSquare } from "lucide-react";
import aiAssistantAvatar from "@/assets/kpmg_df_ai_assistant.png";

const COPILOT_IFRAME_URL = "https://copilotstudio.microsoft.com/environments/Default-2b8dac2b-9179-468b-9bd8-1fbf8bd844c7/bots/auto_agent_fT_Ih/webchat?__version__=2";

export const GlobalCopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  if (location.pathname === "/login" || location.pathname === "/reset-password") return null;

  return (
    <>
      {/* Floating button — visible when chat is closed OR collapsed */}
      {(!isOpen || isCollapsed) && (
        <div className="fixed bottom-10 right-6 z-[9999]" style={{ width: "144px", height: "144px" }}>
          
          {/* Shrink button — top right corner of the bounding square */}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="absolute top-0 right-0 w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10"
              style={{ background: "#0D1B6E", border: "1px solid rgba(0,174,239,0.5)" }}
              title="Riduci"
            >
              <Minus className="h-3 w-3 text-white" />
            </button>
          )}

          {/* Avatar circle */}
          <button
            onClick={() => {
              if (isCollapsed) {
                setIsCollapsed(false); // primo click → torna al cerchio grande
              } else {
                setIsOpen(true);       // secondo click → apre la chat
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
            <img src={aiAssistantAvatar} alt="AI Assistant" className="w-full h-full object-cover" />
          </button>
        </div>
      )}

      {/* Chat window — full size */}
      {isOpen && !isCollapsed && (
        <div
          className="fixed bottom-10 right-6 z-[9999] w-[340px] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            background: "#0D1B6E",
            border: "1px solid rgba(0,174,239,0.3)",
            height: "480px",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{ background: "#0D1B6E", height: "56px" }}
          >
            <div className="flex items-center gap-2.5">
              <img src={aiAssistantAvatar} alt="" className="w-8 h-8 rounded-full" />
              <span className="text-sm font-semibold text-white">KPMG Digital Factory AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Minimize → goes back to floating circle */}
              <button
                onClick={() => { setIsOpen(false); setIsCollapsed(true); }}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-white"
                title="Riduci a icona"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              {/* Close */}
              <button
                onClick={() => { setIsOpen(false); setIsCollapsed(false); }}
                className="p-1.5 rounded hover:bg-white/10 transition-colors text-white"
                title="Chiudi"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <iframe
            src={COPILOT_IFRAME_URL}
            className="flex-1 w-full border-none"
            title="KPMG Digital Factory AI Assistant"
            allow="microphone"
          />
        </div>
      )}
    </>
  );
};
