import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import NLQChat from "@/components/NLQChat";
import { RoleProvider, useRole } from "@/context/RoleContext";

// Pages
import Login from "@/pages/Login";
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
import UserManagement from "@/pages/UserManagement";
import DealerManagement from "@/pages/DealerManagement";
import MLStatus from "@/pages/MLStatus";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedApp = () => {
  const { token } = useRole();

  if (!token) {
    return <Login />;
  }

  return (
    <>
      <DashboardLayout>
        <Routes>
          <Route path="/" element={<AlertFeed />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/parts" element={<Parts />} />
          <Route path="/transit" element={<Transit />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/aging" element={<AgingStock />} />
          <Route path="/forecast" element={<DemandForecast />} />
          <Route path="/genai" element={<GenAIPrompts />} />
          <Route path="/guided" element={<GuidedAssistant />} />
          <Route path="/ai" element={<AIWorkspace />} />
          <Route path="/roi" element={<ROIReport />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/dealers" element={<DealerManagement />} />
          <Route path="/ml-status" element={<MLStatus />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DashboardLayout>
      <NLQChat />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
          <ProtectedApp />
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
