import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlobalCopilotWidget } from "@/components/GlobalCopilotWidget";
import Home from "./pages/Home";
import Index from "./pages/Index";
import ReportViewer from "./pages/ReportViewer";
import BimDashboard from "./pages/BimDashboard";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ExternalViewer from "./pages/ExternalViewer";

const queryClient = new QueryClient();

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <GlobalCopilotWidget />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/report/:id" element={<ProtectedRoute><ReportViewer /></ProtectedRoute>} />
            <Route path="/bim-dashboard" element={<ProtectedRoute><BimDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
            <Route path="/external" element={<ProtectedRoute><ExternalViewer /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
