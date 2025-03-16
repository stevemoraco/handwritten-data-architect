
import * as React from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoginModal } from "@/components/auth/LoginModal";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  
  // If user is already logged in, redirect to process page
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
    <div className="py-6">
      <Dashboard />
      
      {/* Call-to-action for document processing */}
      <div className="mt-8 mx-auto max-w-5xl px-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-8 shadow-sm border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Ready to process your documents?</h2>
              <p className="text-muted-foreground max-w-2xl">
                Upload your documents and our AI-powered system will extract structured data
                to help you analyze and organize your information efficiently.
                {!user && " Create an account to securely store and manage your document history."}
              </p>
              <Button 
                size="lg" 
                className="gap-2"
                onClick={handleStartProcessing}
              >
                <FileText className="h-5 w-5" />
                Start Processing
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="hidden md:block">
              <FileText className="h-24 w-24 text-primary/20" />
            </div>
          </div>
        </div>
      </div>

      {/* Login modal */}
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal} 
        onComplete={handleLoginComplete}
        redirectPath="/process"
      />
    </div>
  );
}
