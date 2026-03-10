import { Flame } from "lucide-react";
import { filterTabs } from "@/data/reports";

interface FilterTabsBarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const FilterTabsBar = ({ activeTab, onTabChange }: FilterTabsBarProps) => {
  return (
    <div className="flex items-center justify-between px-6 py-2.5" style={{ background: "#162893" }}>
      <div className="flex items-center gap-2 overflow-x-auto">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.value
                ? "bg-white/20 text-white border border-white/40"
                : "text-white/70 hover:text-white hover:bg-white/10 border border-transparent"
            }`}
          >
            {tab.icon === "flame" && <Flame className="h-3.5 w-3.5 text-yellow-400" />}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterTabsBar;
