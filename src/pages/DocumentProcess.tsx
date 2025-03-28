
import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentUploader } from "@/components/document/DocumentUploader";
import { DocumentSelector } from "@/components/document/DocumentSelector";
import { useDocuments } from "@/context/DocumentContext";
import { ArrowLeft } from "lucide-react";
import { ProcessingSteps } from "@/components/document/ProcessingSteps";
import { toast } from "@/hooks/use-toast";
import { AIProcessingStep } from "@/types";

export default function DocumentProcess() {
  const { documents, isLoading, fetchUserDocuments } = useDocuments();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get("documentId");
  
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([]);
  const [activeTab, setActiveTab] = React.useState<string>("select");
  const [step, setStep] = React.useState<number>(0);
  const [processingSteps, setProcessingSteps] = React.useState<AIProcessingStep[]>([
    {
      id: "upload",
      name: "Document Upload",
      description: "Uploading and validating documents",
      status: "waiting",
      timestamp: new Date().toISOString()
    },
    {
      id: "transcription",
      name: "Document Transcription",
      description: "Converting document content to text",
      status: "waiting",
      timestamp: new Date().toISOString()
    },
    {
      id: "schema",
      name: "Schema Generation",
      description: "Analyzing document structure",
      status: "waiting",
      timestamp: new Date().toISOString()
    },
    {
      id: "refine",
      name: "Schema Refinement",
      description: "Optimizing schema for accuracy",
      status: "waiting",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isProcessingComplete, setIsProcessingComplete] = React.useState(false);
  
  // Check for documents passed through state
  React.useEffect(() => {
    if (location.state?.documentIds) {
      setSelectedDocumentIds(location.state.documentIds);
      setStep(1); // Move to processing step
    }
  }, [location.state]);
  
  // Handle document selection from query param
  React.useEffect(() => {
    if (documentId) {
      setSelectedDocumentIds([documentId]);
      setStep(1); // Move to processing step
    }
  }, [documentId]);
  
  // Handle document upload completion
  const handleDocumentsUploaded = (documentIds: string[]) => {
    setSelectedDocumentIds(documentIds);
    toast({
      title: "Documents ready",
      description: `${documentIds.length} document(s) ready for processing.`
    });
    setStep(1); // Move to processing step
  };
  
  // Handle document selection
  const handleDocumentsSelected = (documentIds: string[]) => {
    setSelectedDocumentIds(documentIds);
  };
  
  // Handle continue after selection
  const handleContinue = () => {
    if (selectedDocumentIds.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document to continue.",
        variant: "destructive"
      });
      return;
    }
    
    setStep(1); // Move to processing step
  };
  
  // Handle back navigation
  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigate("/documents");
    }
  };

  // Handle starting processing
  const handleStartProcessing = () => {
    // Simulate processing start
    const updatedSteps = processingSteps.map((step, index) => {
      if (index === 0) {
        return { ...step, status: "in_progress" as const };
      }
      return step;
    });
    setProcessingSteps(updatedSteps);
    
    // Simulate processing completion after a delay
    setTimeout(() => {
      const completedSteps = processingSteps.map((step) => {
        return { ...step, status: "completed" as const };
      });
      setProcessingSteps(completedSteps);
      setIsProcessingComplete(true);
    }, 3000);
  };
  
  return (
    <div className="container py-6 md:py-10">
      <Button 
        variant="outline" 
        onClick={handleBack} 
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {step > 0 ? "Back" : "Back to Documents"}
      </Button>
      
      {step === 0 ? (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Process Documents</h1>
            <p className="text-muted-foreground mt-2">
              Upload or select documents to process
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="select">Select Existing</TabsTrigger>
              <TabsTrigger value="upload">Upload New</TabsTrigger>
            </TabsList>
            
            <TabsContent value="select" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Select Documents</CardTitle>
                  <CardDescription>
                    Choose from your existing documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-8">
                  <DocumentSelector 
                    onSelectionChange={handleDocumentsSelected}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleContinue}
                  disabled={selectedDocumentIds.length === 0}
                >
                  Continue
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="upload">
              <DocumentUploader 
                onUploadComplete={handleDocumentsUploaded}
              />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <ProcessingSteps 
          steps={processingSteps}
          onStartProcessing={handleStartProcessing}
          onViewResults={() => navigate("/documents")}
          isProcessingComplete={isProcessingComplete}
          documentCount={selectedDocumentIds.length}
          processedDocuments={isProcessingComplete ? selectedDocumentIds.length : 0}
        />
      )}
    </div>
  );
}
