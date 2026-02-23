import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import ChartIllustration, { type ChartType } from "./ChartIllustration";
import type { Report } from "@/data/reports";

const chartTypeMap: Record<string, ChartType> = {
  "1": "line",
  "2": "donut-bar",
  "3": "horizontal-bar",
  "4": "area-line",
};

interface ReportCardProps {
  report: Report;
}

const ReportCard = ({ report }: ReportCardProps) => {
  const isFeatured = report.featured;

  return (
    <div
      className={`group relative bg-card rounded-xl card-shadow transition-all duration-200 overflow-hidden border-2 ${
        isFeatured
          ? "border-dashed border-primary/40"
          : "border-transparent hover:border-dashed hover:border-primary/30"
      } hover:card-shadow-hover hover:scale-[1.02]`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground pr-2 leading-snug">{report.title}</h3>
          <button className="shrink-0 h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
            <Zap className="h-4 w-4 text-accent-foreground" />
          </button>
        </div>

        {/* Chart */}
        <ChartIllustration type={chartTypeMap[report.id] || "line"} />

        {/* Description */}
        <p className="text-xs text-muted-foreground mt-3 mb-4 line-clamp-2 leading-relaxed">
          {report.description}
        </p>

        {/* CTA */}
        <div className="flex justify-end">
          <Link
            to={`/report/${report.id}`}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Open Report
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
