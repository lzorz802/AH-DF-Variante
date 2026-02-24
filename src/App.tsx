// ============================================================
// FILE: src/App.tsx  (FILE MODIFICATO)
// ============================================================
// MODIFICA: aggiunta rotta /bim-dashboard e redirect del
// ReportViewer per id="5" verso BimDashboard.
//
// DIFF rispetto all'originale:
//   + import BimDashboard
//   + <Route path="/bim-dashboard" element={<BimDashboard />} />
// ============================================================

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ReportViewer from "./pages/ReportViewer";
import BimDashboard from "./pages/BimDashboard";   // ← AGGIUNTO
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/report/:id" element={<ReportViewer />} />
          <Route path="/bim-dashboard" element={<BimDashboard />} />  {/* ← AGGIUNTO */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
