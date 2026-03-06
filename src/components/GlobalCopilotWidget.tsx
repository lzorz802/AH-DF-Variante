import { useState } from "react";
import { Minus, X } from "lucide-react";
import aiAssistantAvatar from "@/assets/kpmg_df_ai_assistant.png";

const COPILOT_IFRAME_URL = "https://copilotstudio.microsoft.com/environments/Default-2b8dac2b-9179-468b-9bd8-1fbf8bd844c7/bots/auto_agent_fT_Ih/webchat?__version__=2";

export const GlobalCopilotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="fixed bottom-6 right-6 z-50 w-36 h-36 rounded-full shadow-lg hover:scale-105 transition-transform overflow-hidden border-2"
          style={{ borderColor: "#00AEEF" }}
          aria-label="Apri assistente virtuale"
        >
          <img src={aiAssistantAvatar} alt="AI Assistant" className="w-full h-full object-cover" />
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[340px] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${isMinimized ? "h-[56px]" : "h-[480px]"}`}
          style={{ background: "#0D1B6E", border: "1px solid rgba(0,174,239,0.3)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: "#0D1B6E" }}>
            <div className="flex items-center gap-2.5">
              <img src={aiAssistantAvatar} alt="" className="w-10 h-10 rounded-full" />
              <span className="text-sm font-semibold text-white">KPMG Digital Factory AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded hover:bg-white/10 transition-colors text-white">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/10 transition-colors text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {!isMinimized && (
            <iframe src={COPILOT_IFRAME_URL} className="flex-1 w-full border-none"
              title="KPMG DF AI Assistant" allow="microphone" />
          )}
        </div>
      )}
    </>
  );
};
