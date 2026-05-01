import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Clients from "./pages/Clients.tsx";
import ClientDetail from "./pages/ClientDetail.tsx";
import Projects from "./pages/Projects.tsx";
import ProjectsArchive from "./pages/ProjectsArchive.tsx";
import ProjectDetail from "./pages/ProjectDetail.tsx";
import Tasks from "./pages/Tasks.tsx";
import Finance from "./pages/Finance.tsx";
import TimerPage from "./pages/Timer.tsx";
import Settings from "./pages/Settings.tsx";
import Proposals from "./pages/Proposals.tsx";
import Invoice from "./pages/Invoice.tsx";
import ProposalEditor from "./pages/ProposalEditor.tsx";
import ProposalView from "./pages/ProposalView.tsx";
import Portal from "./pages/Portal.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/archive" element={<ProtectedRoute><ProjectsArchive /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
        <Route path="/proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
        <Route path="/proposals/:id/edit" element={<ProtectedRoute><ProposalEditor /></ProtectedRoute>} />
        <Route path="/proposals/share/:token" element={<ProposalView />} />
        <Route path="/portal/:token" element={<Portal />} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
        <Route path="/invoice" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
        <Route path="/timer" element={<ProtectedRoute><TimerPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner theme="system" position="top-right" richColors closeButton />
        <BrowserRouter>
          <AuthProvider>
            <WorkspaceProvider>
              <CommandPaletteProvider>
                <AnimatedRoutes />
              </CommandPaletteProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
