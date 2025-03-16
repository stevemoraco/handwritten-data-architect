
import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Upload, ClipboardCheck, ArrowRight, FileText, Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LoginModal } from "@/components/auth/LoginModal";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { Progress } from "@/components/ui/progress";
import { FileUpload } from "@/components/ui/file-upload";
import { useUpload } from "@/context/UploadContext";

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [activeStep, setActiveStep] = React.useState<"upload" | "account" | "invite">("upload");
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const { uploads } = useUpload();
  
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
    setActiveStep("invite");
  };

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    if (!user) {
      setActiveStep("account");
      setShowLoginModal(true);
    } else {
      setActiveStep("invite");
    }
  };

  const handleInviteTeam = () => {
    navigate("/process");
  };

  const totalUploads = uploads.length;
  const completedUploads = uploads.filter(upload => upload.status === "complete").length;
  const uploadProgress = totalUploads > 0 ? Math.round((completedUploads / totalUploads) * 100) : 0;
  
  return (
    <>
      <section className="py-6 text-center">
        <div className="container space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">Handwriting Digitizer</h1>
          <p className="text-xl text-muted-foreground">
            Transform handwritten medical and legal documents into structured digital data with our AI-powered solution.
          </p>
        </div>
      </section>
      
      <section className="bg-muted/30 py-6">
        <div className="container max-w-5xl">
          <div className="text-center mb-4">
            <ProgressSteps 
              steps={[
                { id: "upload", label: "Upload Documents", icon: <Upload className="h-4 w-4" /> },
                { id: "account", label: "Create Account", icon: <Shield className="h-4 w-4" /> },
                { id: "invite", label: "Invite Team", icon: <Users className="h-4 w-4" /> }
              ]} 
              currentStep={activeStep}
              className="mb-4"
            />
          </div>
          
          <Card className="border-dashed bg-background">
            <CardContent className="pt-4 pb-4">
              {activeStep === "upload" && (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  
                  <FileUpload
                    onFilesUploaded={handleFilesSelected}
                    accept={{ 'application/pdf': ['.pdf'] }}
                    className="max-w-md mx-auto"
                  />
                </div>
              )}
              
              {activeStep === "account" && (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium">Create Your Account</h3>
                    <p className="text-muted-foreground text-sm">
                      Secure your documents by creating an account
                    </p>
                  </div>
                  
                  {uploads.length > 0 && (
                    <div className="w-full max-w-md">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Uploading {completedUploads} of {totalUploads} files</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2 mb-3" />
                    </div>
                  )}
                  
                  <Button onClick={() => setShowLoginModal(true)} className="mt-1">
                    Create Account or Sign In
                  </Button>
                </div>
              )}
              
              {activeStep === "invite" && (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-medium">Invite Your Team</h3>
                    <p className="text-muted-foreground text-sm">
                      Collaborate with your team on document processing
                    </p>
                  </div>
                  
                  {uploads.length > 0 && (
                    <div className="w-full max-w-md">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{completedUploads} of {totalUploads} files processed</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2 mb-3" />
                    </div>
                  )}
                  
                  <div className="space-y-3 w-full max-w-md">
                    <div className="flex space-x-2">
                      <input 
                        type="email" 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="team@example.com"
                      />
                      <Button variant="outline">Invite</Button>
                    </div>
                    
                    <Button onClick={handleInviteTeam} className="w-full">
                      Continue to Dashboard
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
      
      <section className="py-6">
        <div className="container max-w-6xl">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="bg-primary/10 rounded-full p-3 inline-flex">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Upload Documents</h3>
              <p className="text-muted-foreground">
                Upload your handwritten documents and let our AI analyze them.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="bg-primary/10 rounded-full p-3 inline-flex">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Review Schema</h3>
              <p className="text-muted-foreground">
                Collaborate with AI to create the perfect data structure for your documents.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="bg-primary/10 rounded-full p-3 inline-flex">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Export Data</h3>
              <p className="text-muted-foreground">
                Access and export your digitized data in various formats.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal} 
        onComplete={handleLoginComplete}
        redirectPath="/process"
      />
    </>
  );
}
