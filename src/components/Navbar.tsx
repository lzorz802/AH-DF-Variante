import { Search, ChevronDown, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import logoClean from "@/assets/logo_digital_factory_clean.png";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const Navbar = ({ searchQuery, onSearchChange }: NavbarProps) => {
  const { user, signOut } = useAuth();

  return (
    <nav className="h-16 flex items-center px-6 gap-4 sticky top-0 z-50" style={{ background: "#0D1B6E" }}>
      <Link to="/" className="flex items-center gap-3 shrink-0">
        <img src={logoClean} alt="KPMG Digital Factory" className="h-10" />
      </Link>

      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <input type="text" placeholder="Search reports..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-9 pl-9 pr-10 rounded-lg border border-white/20 bg-white/10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        {user && (
          <>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="hidden sm:block max-w-[160px] truncate">{user.email}</span>
            </div>
            <button onClick={signOut} title="Esci"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-all">
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
