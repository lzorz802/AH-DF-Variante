import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function ExternalViewer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const url = params.get("url") ?? "";

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alla home
        </button>
        <span className="text-sm text-muted-foreground truncate">{url}</span>
      </div>
      <iframe
        src={url}
        title="External content"
        className="flex-1 w-full border-none"
        allowFullScreen
      />
    </div>
  );
}
