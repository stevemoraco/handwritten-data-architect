
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { DocumentUpload } from "@/components/document/DocumentUpload";
import { ProcessingSteps } from "@/components/document/ProcessingSteps";
import { SchemaDetail } from "@/components/schema/SchemaDetail";
import { SchemaChat } from "@/components/schema/SchemaChat";
import { AIProcessingStep, DocumentSchema } from "@/types";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Layers, MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { buildSchemaGenerationPrompt, buildTranscriptionPrompt, processWithGemini } from "@/services/geminiService";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function DocumentProcess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { schemas, addSchema, generateSchema } = useDocuments();
  const [uploadedDocumentIds, setUploadedDocumentIds] = React.useState<string[]>([]);
  const [steps, setSteps] = React.useState<AIProcessingStep[]>([
    {
      id: uuidv4(),
      name: "Document Upload",
      description: "Upload PDF documents for processing",
      status: "waiting",
      timestamp: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Document Transcription",
      description: "Extract text content from uploaded documents",
      status: "waiting",
      timestamp: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Schema Generation",
      description: "Generate data schema from document content",
      status: "waiting",
      timestamp: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      name: "Schema Refinement",
      description: "Refine schema based on feedback",
      status: "waiting",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [activeTab, setActiveTab] = React.useState("upload");
  const [generatedSchema, setGeneratedSchema] = React.useState<DocumentSchema | null>(null);
  const [isProcessingComplete, setIsProcessingComplete] = React.useState(false);
  const [processStats, setProcessStats] = React.useState({
    documentCount: 0,
    processedDocuments: 0,
    schemaDetails: {
      tables: 0,
      fields: 0
    }
  });

  const handleDocumentsUploaded = async (documentIds: string[]) => {
    setUploadedDocumentIds(documentIds);
    
    // Update step status
    updateStepStatus("Document Upload", "completed");
    
    try {
      // Fetch document metadata
      const { data: documents, error } = await supabase
        .from("documents")
        .select("*")
        .in("id", documentIds);
      
      if (error) {
        throw new Error(`Failed to fetch document metadata: ${error.message}`);
      }
      
      // Update process stats
      setProcessStats(prev => ({
        ...prev,
        documentCount: documentIds.length,
        processedDocuments: documentIds.length
      }));
      
      console.log("Documents uploaded successfully:", documents);
      
      // Auto-navigate to the next step
      setActiveTab("process");
    } catch (error) {
      console.error("Error in document upload handling:", error);
      toast({
        title: "Error",
        description: `Failed to process uploaded documents: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const updateStepStatus = (stepName: string, status: AIProcessingStep["status"], progress?: number, error?: string) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.name === stepName
          ? { ...step, status, progress, error, timestamp: new Date().toISOString() }
          : step
      )
    );
  };

  const startProcessing = async () => {
    if (uploadedDocumentIds.length === 0) {
      toast({
        title: "No documents",
        description: "Please upload at least one document to process.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Process each document for transcription
      updateStepStatus("Document Transcription", "in_progress", 0);
      
      const { data: documents, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .in("id", uploadedDocumentIds);
      
      if (documentsError) {
        throw new Error(`Failed to fetch documents: ${documentsError.message}`);
      }
      
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        
        // Get document pages
        const { data: pages, error: pagesError } = await supabase
          .from("document_pages")
          .select("*")
          .eq("document_id", document.id)
          .order("page_number", { ascending: true });
        
        if (pagesError) {
          throw new Error(`Failed to fetch document pages: ${pagesError.message}`);
        }
        
        if (!pages || pages.length === 0) {
          // If no pages exist, try to process the document
          try {
            await supabase.functions.invoke("pdf-to-images", {
              body: { documentId: document.id }
            });
            
            // Refetch pages after processing
            const { data: updatedPages } = await supabase
              .from("document_pages")
              .select("*")
              .eq("document_id", document.id)
              .order("page_number", { ascending: true });
            
            if (updatedPages && updatedPages.length > 0) {
              console.log(`Generated ${updatedPages.length} pages for document ${document.id}`);
            } else {
              throw new Error(`No pages generated for document ${document.id}`);
            }
          } catch (processingError) {
            console.error(`Error processing document ${document.id}:`, processingError);
            toast({
              title: "Processing error",
              description: `Failed to process document: ${processingError.message}`,
              variant: "destructive"
            });
          }
        }
        
        const progress = ((i + 1) / documents.length) * 100;
        updateStepStatus("Document Transcription", "in_progress", progress);
        
        // Update processed documents count
        setProcessStats(prev => ({
          ...prev,
          processedDocuments: i + 1
        }));
      }
      
      updateStepStatus("Document Transcription", "completed");
      
      // Generate schema from transcribed documents
      updateStepStatus("Schema Generation", "in_progress", 0);
      
      // Reset processed documents for schema generation phase
      setProcessStats(prev => ({
        ...prev,
        processedDocuments: 0
      }));
      
      // Get transcriptions for all documents
      const documentTranscriptions = [];
      for (let i = 0; i < documents.length; i++) {
        const document = documents[i];
        
        // Get document pages with text content
        const { data: pages } = await supabase
          .from("document_pages")
          .select("text_content")
          .eq("document_id", document.id)
          .order("page_number", { ascending: true });
        
        if (pages && pages.length > 0) {
          const transcription = pages.map(page => page.text_content).join("\n\n");
          documentTranscriptions.push(transcription);
        }
        
        // Update processed documents count
        setProcessStats(prev => ({
          ...prev,
          processedDocuments: i + 1
        }));
        
        const progress = ((i + 1) / documents.length) * 100;
        updateStepStatus("Schema Generation", "in_progress", progress);
      }
      
      // Use the generateSchema function from the context
      // In a real implementation, this would use the actual transcriptions
      const schema = await generateSchema(uploadedDocumentIds);
      setGeneratedSchema(schema);
      
      // Update final schema details based on the actual generated schema
      if (schema && schema.structure) {
        const totalFields = schema.structure.reduce(
          (sum, table) => sum + (table.fields?.length || 0), 
          0
        );
        
        setProcessStats(prev => ({
          ...prev,
          schemaDetails: {
            tables: schema.structure.length,
            fields: totalFields
          }
        }));
      }
      
      updateStepStatus("Schema Generation", "completed");
      updateStepStatus("Schema Refinement", "in_progress");
      
      // Auto-navigate to schema review
      setActiveTab("schema");
      
    } catch (error) {
      console.error("Error in document processing:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      toast({
        title: "Processing error",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Update the current step to show the error
      const currentStep = steps.find(step => step.status === "in_progress");
      if (currentStep) {
        updateStepStatus(currentStep.name, "failed", undefined, errorMessage);
      }
    }
  };

  const handleSchemaApprove = () => {
    updateStepStatus("Schema Refinement", "completed");
    setIsProcessingComplete(true);
    setActiveTab("schema");
    
    toast({
      title: "Schema approved",
      description: "Your document schema has been successfully approved."
    });
  };

  const handleSchemaModify = () => {
    setActiveTab("chat");
  };

  const handleSchemaUpdate = () => {
    // This would be called when the chat suggests schema updates
    toast({
      title: "Schema updated",
      description: "Your schema has been updated based on your feedback."
    });
  };

  const viewResults = () => {
    // Navigate to the results page
    if (uploadedDocumentIds.length > 0) {
      navigate(`/document/${uploadedDocumentIds[0]}`);
    } else {
      setActiveTab("schema");
    }
  };

  return (
    <div className="container py-10 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Document Processing Workflow</h1>
        <div className="w-[88px]"></div> {/* Spacer for alignment */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ProcessingSteps
            steps={steps}
            onStartProcessing={startProcessing}
            onViewResults={viewResults}
            isProcessingComplete={isProcessingComplete}
            documentCount={processStats.documentCount}
            processedDocuments={processStats.processedDocuments}
            schemaDetails={processStats.schemaDetails}
          />
        </div>
        
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="upload" disabled={isProcessingComplete}>
                <FileText className="h-4 w-4 mr-2" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="schema" disabled={!generatedSchema}>
                <Layers className="h-4 w-4 mr-2" />
                Schema
              </TabsTrigger>
              <TabsTrigger value="chat" disabled={!generatedSchema}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Feedback
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="mt-4">
              <DocumentUpload 
                onDocumentsUploaded={handleDocumentsUploaded}
              />
            </TabsContent>
            
            <TabsContent value="schema" className="mt-4">
              {generatedSchema ? (
                <SchemaDetail
                  schema={generatedSchema}
                  onApprove={handleSchemaApprove}
                  onModify={handleSchemaModify}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No schema generated yet.</p>
                      <p>Upload documents and start processing to generate a schema.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="chat" className="mt-4">
              {generatedSchema ? (
                <SchemaChat
                  schemaId={generatedSchema.id}
                  onSchemaUpdate={handleSchemaUpdate}
                />
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No schema to provide feedback on yet.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
