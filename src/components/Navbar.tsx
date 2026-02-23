import { Search, Star, Bell, HelpCircle, ChevronDown } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 sticky top-0 z-50">
      {/* Logo + Title */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xl font-bold tracking-tight text-primary">KPMG</span>
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
            className="w-full h-9 pl-9 pr-10 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3 shrink-0">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Star className="h-4 w-4" />
          <span className="hidden sm:inline">Favorites</span>
        </button>
        <button className="relative text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            5
          </span>
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-4 w-4" />
        </button>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
            AJ
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground leading-tight">Alex Johnson</p>
            <p className="text-xs text-muted-foreground leading-tight">Data Analyst</p>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
