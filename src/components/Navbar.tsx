import { Search, ChevronDown, LogOut, User } from "lucide-react";
import kpmgLogo from "@/assets/kpmg-logo.png";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const Navbar = ({ searchQuery, onSearchChange }: NavbarProps) => {
  const { user, signOut } = useAuth();

  return (
    <nav className="h-16 bg-card border-b border-border flex items-center px-6 gap-4 sticky top-0 z-50">
      <div className="flex items-center gap-3 shrink-0">
        <img src={kpmgLogo} alt="KPMG" className="h-7" />
        <div className="w-px h-8 bg-border" />
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-tight">Analytics Portal</h1>
          <p className="text-xs text-muted-foreground leading-tight">Explore &amp; Access Power BI Reports</p>
        </div>
      </div>

      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search reports..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-10 rounded-lg border border-border bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        {user && (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="hidden sm:block max-w-[160px] truncate">{user.email}</span>
            </div>
            <button onClick={signOut} title="Esci"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border transition-all">
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Esci</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
