
import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useDocuments } from "@/context/DocumentContext";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, FileText, Shield, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { LoginModal } from "@/components/auth/LoginModal";
import { Badge } from "@/components/ui/badge";
import { DocumentSelector } from "./DocumentSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "./DocumentUploader";

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
  const { user } = useAuth();
  const { documents, isLoading } = useDocuments();
  const navigate = useNavigate();
  const [selectedExistingDocumentIds, setSelectedExistingDocumentIds] = React.useState<string[]>([]);
  const [uploadedDocumentIds, setUploadedDocumentIds] = React.useState<string[]>([]);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<string>("existing");

  const handleExistingDocumentSelection = (documentIds: string[]) => {
    setSelectedExistingDocumentIds(documentIds);
  };

  const handleUploadsComplete = (documentIds: string[]) => {
    setUploadedDocumentIds(prev => [...prev, ...documentIds]);
  };

  const handleContinue = () => {
    const allSelectedDocumentIds = [
      ...uploadedDocumentIds,
      ...selectedExistingDocumentIds
    ];
    
    if (onDocumentsUploaded && allSelectedDocumentIds.length > 0) {
      onDocumentsUploaded(allSelectedDocumentIds);
    } else if (allSelectedDocumentIds.length > 0) {
      navigate(`/process`, { state: { documentIds: allSelectedDocumentIds } });
    } else {
      toast({
        title: "No documents selected",
        description: "Please upload or select at least one document to continue.",
        variant: "destructive"
      });
    }
  };

  const handleAuthComplete = () => {
    setShowLoginModal(false);
    toast({
      title: "Account created successfully",
      description: "You can now securely upload and process your documents.",
    });
  };

  const totalDocuments = documents.length;
  const totalSelected = uploadedDocumentIds.length + selectedExistingDocumentIds.length;

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Documents
            </div>
            {totalSelected > 0 && (
              <Badge variant="default" className="ml-2">
                {totalSelected} selected
              </Badge>
            )}
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="existing">
                Select Existing
              </TabsTrigger>
              <TabsTrigger value="upload">
                Upload New
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="existing">
              <DocumentSelector
                onSelectionChange={handleExistingDocumentSelection}
                showTitle={false}
                maxSelections={5}
              />
            </TabsContent>
            
            <TabsContent value="upload">
              <DocumentUploader
                onUploadComplete={handleUploadsComplete}
              />
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedExistingDocumentIds.length > 0 && (
              <Badge variant="outline" className="bg-primary/10">
                {selectedExistingDocumentIds.length} existing document{selectedExistingDocumentIds.length !== 1 ? 's' : ''} selected
              </Badge>
            )}
            {uploadedDocumentIds.length > 0 && (
              <Badge variant="outline" className="bg-primary/10">
                {uploadedDocumentIds.length} new document{uploadedDocumentIds.length !== 1 ? 's' : ''} uploaded
              </Badge>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {totalSelected > 0 ? (
              <span>{totalSelected} document{totalSelected !== 1 ? 's' : ''} selected</span>
            ) : totalDocuments > 0 ? (
              <span>{totalDocuments} document{totalDocuments !== 1 ? 's' : ''} available</span>
            ) : (
              <span>Upload or select documents to continue</span>
            )}
          </div>
          
          <Button 
            onClick={handleContinue}
            disabled={totalSelected === 0}
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal} 
        onComplete={handleAuthComplete} 
      />
    </>
  );
}
