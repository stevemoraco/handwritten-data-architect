
import * as React from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUpload } from "@/context/UploadContext";
import { useDocuments } from "@/context/DocumentContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, FileText, Lock, Shield, User } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { AuthForm } from "@/components/auth/AuthForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DocumentUploadProps {
  onDocumentsUploaded?: (documentIds: string[]) => void;
  pipelineId?: string;
  className?: string;
}

export function DocumentUpload({
  onDocumentsUploaded,
  pipelineId,
  className,
}: DocumentUploadProps) {
  const { isUploading, uploads } = useUpload();
  const { addDocument } = useDocuments();
  const { user } = useAuth();
  const [uploadedDocumentIds, setUploadedDocumentIds] = React.useState<string[]>([]);
  const [showAuthDialog, setShowAuthDialog] = React.useState(false);

  const handleFilesUploaded = async (files: File[]) => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    try {
      const newDocumentIds = await Promise.all(
        files.map(async (file) => {
          // Convert the file to a data URL for demo purposes
          // In a real app, you'd upload to a storage service
          const fileDataUrl = await fileToDataUrl(file);
          
          // Create a new document record for each file
          const newDocument = await addDocument({
            name: file.name,
            type: file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image",
            status: "uploaded",
            url: fileDataUrl,
            pipelineId,
          });
          
          return newDocument.id;
        })
      );

      setUploadedDocumentIds((prev) => [...prev, ...newDocumentIds]);
      
      toast({
        title: "Files uploaded successfully",
        description: `${files.length} document${files.length > 1 ? 's' : ''} ready for processing.`,
      });
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    if (onDocumentsUploaded && uploadedDocumentIds.length > 0) {
      onDocumentsUploaded(uploadedDocumentIds);
    }
  };

  const handleAuthComplete = () => {
    setShowAuthDialog(false);
    toast({
      title: "Account created successfully",
      description: "You can now securely upload and process your documents.",
    });
  };

  // Helper function to convert a file to a data URL
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const successfulUploads = uploads.filter(upload => upload.status === "complete").length;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {!user && (
            <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Shield className="h-4 w-4" />
              <AlertTitle>Secure document handling</AlertTitle>
              <AlertDescription className="mt-2">
                <p className="mb-2">
                  To upload and process your documents securely, you'll need to create an account or sign in.
                  Your account ensures that:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your documents remain private and secure</li>
                  <li>You can access your processed documents later</li>
                  <li>Your processing history is saved for future reference</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <FileUpload
            onFilesUploaded={handleFilesUploaded}
            accept={{ 'application/pdf': ['.pdf'] }}
            disabled={isUploading}
          />
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {successfulUploads > 0 ? (
              <span>{successfulUploads} document{successfulUploads > 1 ? 's' : ''} uploaded</span>
            ) : (
              <span>Upload PDF documents to continue</span>
            )}
          </div>
          
          <Button 
            onClick={handleContinue}
            disabled={uploads.length === 0 || isUploading || successfulUploads === 0}
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Create Your Secure Account
            </DialogTitle>
            <DialogDescription className="pt-2 pb-1">
              <div className="space-y-2">
                <p>
                  Your documents contain valuable information. Creating an account ensures your data remains 
                  secure and accessible only to you.
                </p>
                <div className="pt-1 flex flex-col space-y-1.5">
                  <div className="flex items-start gap-2">
                    <Lock className="h-4 w-4 mt-0.5 text-primary" />
                    <span className="text-sm">End-to-end security for your sensitive documents</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-0.5 text-primary" />
                    <span className="text-sm">Complete control over your data and processing history</span>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <AuthForm onComplete={handleAuthComplete} />
        </DialogContent>
      </Dialog>
    </>
  );
}
