import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NLQChat from "@/components/NLQChat";
import { RoleProvider } from "@/context/RoleContext";

// Pages
import AlertFeed from "@/pages/AlertFeed";
import Overview from "@/pages/Overview";
import Inventory from "@/pages/Inventory";
import Parts from "@/pages/Parts";
import Transit from "@/pages/Transit";
import Customers from "@/pages/Customers";
import AgingStock from "@/pages/AgingStock";
import DemandForecast from "@/pages/DemandForecast";
import GenAIPrompts from "@/pages/GenAIPrompts";
import GuidedAssistant from "@/pages/GuidedAssistant";
import ROIReport from "@/pages/ROIReport";
import AIWorkspace from "@/pages/AIWorkspace";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RoleProvider>
        <BrowserRouter>
          <DashboardLayout>
            <Routes>
              {/* New default home — Today's Actions */}
              <Route path="/" element={<AlertFeed />} />
              {/* Network Overview (was home) */}
              <Route path="/overview" element={<Overview />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/parts" element={<Parts />} />
              <Route path="/transit" element={<Transit />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/aging" element={<AgingStock />} />
              <Route path="/forecast" element={<DemandForecast />} />
              {/* Legacy routes kept for backward compat */}
              <Route path="/genai" element={<GenAIPrompts />} />
              <Route path="/guided" element={<GuidedAssistant />} />
              {/* New merged AI Workspace */}
              <Route path="/ai" element={<AIWorkspace />} />
              <Route path="/roi" element={<ROIReport />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        </BrowserRouter>
        <NLQChat />
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
