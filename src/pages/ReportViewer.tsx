import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { reports } from "@/data/reports";

const PBI_NATIVE_URL =
  "https://app.powerbi.com/groups/me/reports/b205ca9f-7bf3-4e43-b1cd-a9a1deb03110";

const ReportViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const report = reports.find((r) => r.id === id);

  useEffect(() => {
    if (id === "5") {
      navigate("/bim-dashboard", { replace: true });
    }
  }, [id, navigate]);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Report not found.</p>
      </div>
    );
  }

  if (id === "5") return null;

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <span className="text-sm font-semibold text-foreground truncate flex-1">
          {report.title}
        </span>

        {id === "6" && (
          <a
            href={PBI_NATIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f2c811] hover:bg-[#e0b800] text-gray-900 text-sm font-medium transition-colors shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
            Apri report con Copilot
          </a>
        )}
      </div>

      <iframe
        src={report.url}
        title={report.title}
        className="flex-1 w-full border-none"
        allowFullScreen
      />
    </div>
  );
};

export default ReportViewer;
