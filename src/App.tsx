
import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { DocumentProvider } from "@/context/DocumentContext";
import { UploadProvider } from "@/context/UploadContext";
import { AppLayout } from "@/components/layout/AppLayout";

// Lazy-loaded pages
const IndexPage = lazy(() => import("@/pages/Index"));
const AuthCallbackPage = lazy(() => import("@/pages/auth/AuthCallback"));
const AuthPage = lazy(() => import("@/pages/auth/AuthPage"));
const FeaturesPage = lazy(() => import("@/pages/Features"));
const PricingPage = lazy(() => import("@/pages/Pricing"));
const DocumentationPage = lazy(() => import("@/pages/Documentation"));
const APIPage = lazy(() => import("@/pages/API"));
const ContactPage = lazy(() => import("@/pages/Contact"));
const HelpCenterPage = lazy(() => import("@/pages/HelpCenter"));
const SecurityPage = lazy(() => import("@/pages/Security"));
const SOC2Page = lazy(() => import("@/pages/SOC2"));
const PrivacyPage = lazy(() => import("@/pages/Privacy"));
const TermsPage = lazy(() => import("@/pages/Terms"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));
const DocumentProcessPage = lazy(() => import("@/pages/DocumentProcess"));
const DocumentsPage = lazy(() => import("@/pages/Documents"));
const DocumentPage = lazy(() => import("@/pages/Document"));
const PipelinesPage = lazy(() => import("@/pages/Pipelines"));
const SettingsPage = lazy(() => import("@/pages/Settings"));

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <DocumentProvider>
          <UploadProvider>
            <BrowserRouter>
              <Suspense 
                fallback={
                  <div className="flex items-center justify-center h-screen">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<AppLayout><Outlet /></AppLayout>}>
                    {/* Public routes */}
                    <Route index element={<IndexPage />} />
                    <Route path="auth" element={<AuthPage />} />
                    <Route path="features" element={<FeaturesPage />} />
                    <Route path="pricing" element={<PricingPage />} />
                    <Route path="docs" element={<DocumentationPage />} />
                    <Route path="api" element={<APIPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="help" element={<HelpCenterPage />} />
                    <Route path="security" element={<SecurityPage />} />
                    <Route path="soc2" element={<SOC2Page />} />
                    <Route path="privacy" element={<PrivacyPage />} />
                    <Route path="terms" element={<TermsPage />} />
                    
                    {/* Protected routes */}
                    <Route path="process" element={<DocumentProcessPage />} />
                    <Route path="documents" element={<DocumentsPage />} />
                    <Route path="document/:documentId" element={<DocumentPage />} />
                    <Route path="pipelines" element={<PipelinesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    
                    {/* Auth callback */}
                    <Route path="auth/callback" element={<AuthCallbackPage />} />
                    
                    {/* 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Suspense>
              <Toaster />
              <SonnerToaster />
            </BrowserRouter>
          </UploadProvider>
        </DocumentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
