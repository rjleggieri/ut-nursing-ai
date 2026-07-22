import { Toaster as Sonner } from "@/components/ui/sonner";
import { HashRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import FacultyDashboard from "./pages/FacultyDashboard";
import NotFound from "./pages/NotFound";
import { SocketProvider } from "./contexts/SocketProvider";

const App = () => {
  return (
    <SocketProvider>
      <Sonner />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/faculty-dashboard" element={<FacultyDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </SocketProvider>
  );
};

export default App;
