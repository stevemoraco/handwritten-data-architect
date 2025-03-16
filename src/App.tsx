
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/layout/AppLayout";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import API from "./pages/API";
import Contact from "./pages/Contact";
import Documentation from "./pages/Documentation";
import HelpCenter from "./pages/HelpCenter";
import Security from "./pages/Security";
import SOC2 from "./pages/SOC2";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import DocumentProcess from "./pages/DocumentProcess";
import AuthPage from "./pages/auth/AuthPage";
import AuthCallback from "./pages/auth/AuthCallback";
import { Toaster } from "./components/ui/toaster";
import { AuthProvider } from "./context/AuthContext";
import { UploadProvider } from "./context/UploadContext";

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UploadProvider>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route
                path="/"
                element={
                  <AppLayout>
                    <Index />
                  </AppLayout>
                }
              />
              <Route
                path="/features"
                element={
                  <AppLayout>
                    <Features />
                  </AppLayout>
                }
              />
              <Route
                path="/pricing"
                element={
                  <AppLayout>
                    <Pricing />
                  </AppLayout>
                }
              />
              <Route
                path="/api"
                element={
                  <AppLayout>
                    <API />
                  </AppLayout>
                }
              />
              <Route
                path="/contact"
                element={
                  <AppLayout>
                    <Contact />
                  </AppLayout>
                }
              />
              <Route
                path="/documentation"
                element={
                  <AppLayout>
                    <Documentation />
                  </AppLayout>
                }
              />
              <Route
                path="/help"
                element={
                  <AppLayout>
                    <HelpCenter />
                  </AppLayout>
                }
              />
              <Route
                path="/security"
                element={
                  <AppLayout>
                    <Security />
                  </AppLayout>
                }
              />
              <Route
                path="/soc2"
                element={
                  <AppLayout>
                    <SOC2 />
                  </AppLayout>
                }
              />
              <Route
                path="/terms"
                element={
                  <AppLayout>
                    <Terms />
                  </AppLayout>
                }
              />
              <Route
                path="/privacy"
                element={
                  <AppLayout>
                    <Privacy />
                  </AppLayout>
                }
              />
              <Route
                path="/process"
                element={
                  <AppLayout>
                    <DocumentProcess />
                  </AppLayout>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </UploadProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
