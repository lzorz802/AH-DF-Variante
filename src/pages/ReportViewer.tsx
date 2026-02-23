import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { reports } from "@/data/reports";

const ReportViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const report = reports.find((r) => r.id === id);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Report not found.</p>
      </div>
    );
  }

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
        <span className="text-sm font-semibold text-foreground truncate">{report.title}</span>
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
