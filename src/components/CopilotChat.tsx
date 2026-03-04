// src/components/CopilotChat.tsx
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

const COPILOT_URL = "QUI_INCOLLA_URL_DELL_IFRAME_DA_COPILOT_STUDIO";

const CopilotChat = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Pulsante floating */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full
                     bg-primary text-primary-foreground shadow-lg
                     flex items-center justify-center hover:opacity-90 transition-all"
          aria-label="Apri assistente virtuale"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat popup */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px]
                        bg-card rounded-2xl shadow-2xl border border-border
                        flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Web App Agent</span>
            </div>
            <button onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 hover:opacity-70" />
            </button>
          </div>

          {/* Iframe agente */}
          <iframe
            src={COPILOT_URL}
            className="flex-1 w-full border-none"
            title="Web App Agent"
            allow="microphone"
          />
        </div>
      )}
    </>
  );
};

export default CopilotChat;
