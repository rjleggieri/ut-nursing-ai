import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import FacultyDashboard from "./pages/FacultyDashboard";
import NotFound from "./pages/NotFound";
import { SocketProvider } from "./contexts/SocketContext";

const queryClient = new QueryClient();

const App = () => {
  return (
    <SocketProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </SocketProvider>
  );
};

export default App;
