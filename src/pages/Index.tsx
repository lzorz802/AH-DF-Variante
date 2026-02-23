import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import FilterTabsBar from "@/components/FilterTabsBar";
import ReportCard from "@/components/ReportCard";
import { reports } from "@/data/reports";

const Index = () => {
  const [activeTab, setActiveTab] = useState("all");

  const filteredReports = useMemo(
    () => (activeTab === "all" ? reports : reports.filter((r) => r.tag === activeTab)),
    [activeTab]
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
              There are no reports in this category yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
