import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Upload, ClipboardCheck, ArrowRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoginModal } from "@/components/auth/LoginModal";
import { Card, CardContent } from "@/components/ui/card";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  
  React.useEffect(() => {
    if (user) {
      navigate("/process");
    }
  }, [user, navigate]);
  
  const handleStartProcessing = () => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      navigate("/process");
    }
  };
  
  const handleLoginComplete = () => {
    setShowLoginModal(false);
    navigate("/process");
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background py-4">
        <div className="container flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Handwriting Digitizer</span>
          </div>
          <nav className="flex items-center space-x-6">
            <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Dashboard</a>
            <a href="/process" className="text-sm text-muted-foreground hover:text-foreground">Document Pipelines</a>
            <a href="/export" className="text-sm text-muted-foreground hover:text-foreground">Export Data</a>
            {user ? (
              <Button onClick={() => navigate("/process")} variant="default">Dashboard</Button>
            ) : (
              <div className="flex items-center space-x-3">
                <Button onClick={() => setShowLoginModal(true)} variant="outline">Log in</Button>
                <Button onClick={() => setShowLoginModal(true)}>Sign up</Button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <section className="py-20 text-center">
        <div className="container space-y-6 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">Handwriting Digitizer</h1>
          <p className="text-xl text-muted-foreground">
            Transform handwritten medical and legal documents into structured digital data with our AI-powered solution.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button 
              onClick={handleStartProcessing}
              size="lg" 
              className="px-8 font-medium"
            >
              Upload Documents
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setShowLoginModal(true)}
              className="px-8 font-medium"
            >
              Create Account
            </Button>
            <Button 
              variant="ghost" 
              size="lg"
              className="px-8 font-medium"
            >
              Invite Team
            </Button>
          </div>
        </div>
      </section>
      
      <section className="bg-muted/30 py-16">
        <div className="container max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Upload Example Documents</h2>
            <p className="text-muted-foreground">
              Start by uploading 2-3 sample PDFs to help us generate a document schema.
            </p>
          </div>
          
          <Card className="border-dashed bg-background">
            <CardContent className="pt-10 flex flex-col items-center justify-center space-y-8 pb-10">
              <div className="rounded-full bg-primary/10 p-5">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium">Upload your documents</h3>
                <p className="text-muted-foreground text-sm">
                  Drag & drop your PDF files here or click to browse
                </p>
              </div>
              
              <Button className="mt-2">
                Select files
              </Button>
              
              <Button variant="outline" className="mt-4 gap-2" onClick={handleStartProcessing}>
                Next Step
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <section className="py-16">
        <div className="container max-w-6xl">
          <h2 className="text-2xl font-bold mb-10">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="bg-primary/10 rounded-full p-4 inline-flex">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium">Upload Documents</h3>
              <p className="text-muted-foreground">
                Upload your handwritten documents and let our AI analyze them.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-primary/10 rounded-full p-4 inline-flex">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium">Review Schema</h3>
              <p className="text-muted-foreground">
                Collaborate with AI to create the perfect data structure for your documents.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-primary/10 rounded-full p-4 inline-flex">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-medium">Export Data</h3>
              <p className="text-muted-foreground">
                Access and export your digitized data in various formats.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="mt-auto bg-muted/30 border-t py-12">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Handwriting Digitizer</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Transform handwritten documents into structured data effortlessly. Built for healthcare providers, law firms, and any organization handling handwritten information.
              </p>
              <div className="flex space-x-4 pt-2">
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                    <path d="M9 18c-4.51 2-5-2-7-2"></path>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                  </svg>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-base mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Security</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">SOC2 Compliance</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-base mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Documentation</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">API</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground text-sm">Contact</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal} 
        onComplete={handleLoginComplete}
        redirectPath="/process"
      />
    </div>
  );
}
