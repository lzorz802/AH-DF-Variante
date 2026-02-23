import { Search, ChevronDown } from "lucide-react";
import kpmgLogo from "@/assets/kpmg-logo.png";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const Navbar = ({ searchQuery, onSearchChange }: NavbarProps) => {
  return (
    <nav className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 sticky top-0 z-50">
      {/* Logo + Title */}
      <div className="flex items-center gap-3 shrink-0">
        <img src={kpmgLogo} alt="KPMG" className="h-7" />
        <div className="w-px h-8 bg-border" />
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-tight">Analytics Portal</h1>
          <p className="text-xs text-muted-foreground leading-tight">Explore &amp; Access Power BI Reports</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-10 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="shrink-0" />
    </nav>
  );
};

export default Navbar;
