
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { DocumentUpload } from "@/components/document/DocumentUpload";
import { ProcessingSteps } from "@/components/document/ProcessingSteps";
import { SchemaDetail } from "@/components/schema/SchemaDetail";
import { SchemaChat } from "@/components/schema/SchemaChat";
import { AIProcessingStep, DocumentSchema } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Layers, MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

// Mock page details for simulation
const generateMockPages = (pageCount: number) => {
  return Array.from({ length: pageCount }).map((_, i) => ({
    pageNumber: i + 1,
    status: "waiting" as const,
    thumbnail: undefined,
    text: undefined,
    error: undefined
  }));
};

export default function DocumentProcess() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
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
  const [documentDetails, setDocumentDetails] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!user && !user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [user, navigate, toast]);

  const handleDocumentsUploaded = async (documentIds: string[]) => {
    if (!documentIds.length) return;
    
    setUploadedDocumentIds(documentIds);
    updateStepStatus("Document Upload", "completed");
    
    try {
      const { data: documents, error } = await supabase
        .from("documents")
        .select("*")
        .in("id", documentIds);
      
      if (error) {
        throw new Error(`Failed to fetch document metadata: ${error.message}`);
      }
      
      setProcessStats(prev => ({
        ...prev,
        documentCount: documentIds.length,
        processedDocuments: documentIds.length
      }));
      
      // Create initial document details
      const initialDocDetails = documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        pageCount: doc.page_count || 5, // Use actual page count or default to 5
        processedPages: 0,
        status: "waiting" as const,
        pages: generateMockPages(doc.page_count || 5),
        thumbnail: undefined,
        error: undefined
      }));
      
      setDocumentDetails(initialDocDetails);
      console.log("Documents uploaded successfully:", documents);
      
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

  const updateDocumentStatus = (docId: string, status: "waiting" | "processing" | "completed" | "failed", processedPages?: number, error?: string) => {
    setDocumentDetails(prev => 
      prev.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              status, 
              processedPages: processedPages !== undefined ? processedPages : doc.processedPages,
              error
            } 
          : doc
      )
    );
  };

  const updatePageStatus = (docId: string, pageNumber: number, status: "waiting" | "processing" | "completed" | "failed", updates: Partial<{ thumbnail: string, text: string, error: string }> = {}) => {
    setDocumentDetails(prev => 
      prev.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              pages: doc.pages.map(page => 
                page.pageNumber === pageNumber
                  ? { ...page, status, ...updates }
                  : page
              )
            } 
          : doc
      )
    );
  };

  // Simulate document transcription process with realistic timing
  const simulateDocumentTranscription = async () => {
    updateStepStatus("Document Transcription", "in_progress", 0);
    setProcessStats(prev => ({ ...prev, processedDocuments: 0 }));
    
    const totalDocs = documentDetails.length;
    let processedDocs = 0;
    let totalPages = 0;
    let processedPages = 0;
    
    // Calculate total pages
    documentDetails.forEach(doc => {
      totalPages += doc.pageCount;
    });
    
    // Process each document
    for (const doc of documentDetails) {
      console.log(`Starting transcription of document: ${doc.name}`);
      updateDocumentStatus(doc.id, "processing", 0);
      
      // Process pages for this document
      for (let i = 0; i < doc.pages.length; i++) {
        const pageNumber = i + 1;
        const page = doc.pages[i];
        
        // Update page to processing
        updatePageStatus(doc.id, pageNumber, "processing");
        
        // Simulate processing time (2-4 seconds per page)
        const processingTime = 2000 + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        // Generate a random thumbnail (placeholder)
        const dummyThumbnail = `https://via.placeholder.com/800x1000?text=Page+${pageNumber}`;
        
        // Generate dummy text content
        const dummyText = `This is extracted text from page ${pageNumber} of document ${doc.name}. The content appears to include several paragraphs of information that have been successfully extracted using OCR technology.`;
        
        // Randomly simulate a failure (5% chance)
        const shouldFail = Math.random() < 0.05;
        
        if (shouldFail) {
          updatePageStatus(doc.id, pageNumber, "failed", {
            error: "OCR processing failed for this page"
          });
          console.log(`Failed to process page ${pageNumber} of document ${doc.id}`);
        } else {
          // Update page to completed with thumbnail and text
          updatePageStatus(doc.id, pageNumber, "completed", {
            thumbnail: dummyThumbnail,
            text: dummyText
          });
          console.log(`Processed page ${pageNumber} of document ${doc.id}`);
        }
        
        // Update document processed pages count
        updateDocumentStatus(doc.id, "processing", i + 1);
        
        // Update global progress
        processedPages++;
        const transcriptionProgress = (processedPages / totalPages) * 100;
        updateStepStatus("Document Transcription", "in_progress", transcriptionProgress);
        
        setProcessStats(prev => ({
          ...prev,
          processedDocuments: processedPages
        }));
      }
      
      // Mark document as completed
      updateDocumentStatus(doc.id, "completed", doc.pageCount);
      processedDocs++;
      
      console.log(`Completed transcription of document: ${doc.name}`);
      
      // Add document thumbnail (first page)
      const firstPageWithThumbnail = doc.pages.find(p => p.status === "completed" && p.thumbnail);
      if (firstPageWithThumbnail) {
        setDocumentDetails(prev => 
          prev.map(d => 
            d.id === doc.id 
              ? { ...d, thumbnail: firstPageWithThumbnail.thumbnail } 
              : d
          )
        );
      }
    }
    
    updateStepStatus("Document Transcription", "completed");
    console.log("Document transcription completed");
    
    // Move to schema generation next
    simulateSchemaGeneration();
  };

  // Simulate schema generation process
  const simulateSchemaGeneration = async () => {
    updateStepStatus("Schema Generation", "in_progress", 0);
    setProcessStats(prev => ({ ...prev, processedDocuments: 0 }));
    
    const totalDocs = documentDetails.length;
    let processedDocs = 0;
    
    // Reset document statuses for schema generation
    setDocumentDetails(prev => 
      prev.map(doc => ({
        ...doc,
        status: "waiting"
      }))
    );
    
    // Process each document for schema generation
    for (const doc of documentDetails) {
      console.log(`Analyzing document for schema: ${doc.name}`);
      updateDocumentStatus(doc.id, "processing");
      
      // Simulate processing time (3-6 seconds per document)
      const processingTime = 3000 + Math.random() * 3000;
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Mark document as completed
      updateDocumentStatus(doc.id, "completed");
      processedDocs++;
      
      // Update progress
      const schemaProgress = (processedDocs / totalDocs) * 100;
      updateStepStatus("Schema Generation", "in_progress", schemaProgress);
      
      setProcessStats(prev => ({
        ...prev,
        processedDocuments: processedDocs,
        schemaDetails: {
          tables: Math.min(10, prev.schemaDetails.tables + 1 + Math.floor(Math.random() * 2)),
          fields: Math.min(50, prev.schemaDetails.fields + 5 + Math.floor(Math.random() * 10))
        }
      }));
      
      console.log(`Completed schema analysis for document: ${doc.name}`);
    }
    
    updateStepStatus("Schema Generation", "completed");
    console.log("Schema generation completed");
    
    // Create mock schema
    const mockSchema: DocumentSchema = {
      id: uuidv4(),
      name: `Schema for ${totalDocs} document(s)`,
      description: "Automatically generated schema based on document content",
      rationale: "Basic document information schema with intelligent field mapping",
      suggestions: [
        "Consider adding a 'category' field to classify documents",
        "Date formats should be standardized across all documents"
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationId: user?.organizationId || '',
      structure: [
        {
          id: uuidv4(),
          name: "Document Information",
          description: "Basic document metadata",
          displayOrder: 1,
          fields: [
            {
              id: uuidv4(),
              name: "document_id",
              description: "Unique document identifier",
              type: "string",
              required: true,
              displayOrder: 1
            },
            {
              id: uuidv4(),
              name: "document_name",
              description: "Document filename",
              type: "string",
              required: true,
              displayOrder: 2
            },
            {
              id: uuidv4(),
              name: "upload_date",
              description: "Date of upload",
              type: "date",
              required: true,
              displayOrder: 3
            },
            {
              id: uuidv4(),
              name: "page_count",
              description: "Number of pages",
              type: "number",
              required: false,
              displayOrder: 4
            }
          ]
        },
        {
          id: uuidv4(),
          name: "Invoice Details",
          description: "Invoice specific information",
          displayOrder: 2,
          fields: [
            {
              id: uuidv4(),
              name: "invoice_number",
              description: "Invoice reference number",
              type: "string",
              required: true,
              displayOrder: 1
            },
            {
              id: uuidv4(),
              name: "issue_date",
              description: "Date invoice was issued",
              type: "date",
              required: true,
              displayOrder: 2
            },
            {
              id: uuidv4(),
              name: "due_date",
              description: "Payment due date",
              type: "date",
              required: true,
              displayOrder: 3
            },
            {
              id: uuidv4(),
              name: "total_amount",
              description: "Total invoice amount",
              type: "number",
              required: true,
              displayOrder: 4
            },
            {
              id: uuidv4(),
              name: "tax_amount",
              description: "Tax amount",
              type: "number",
              required: false,
              displayOrder: 5
            }
          ]
        }
      ]
    };
    
    setGeneratedSchema(mockSchema);
    
    // Move to schema refinement
    updateStepStatus("Schema Refinement", "in_progress");
    setActiveTab("schema");
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
      // Start the realistic document processing simulation
      simulateDocumentTranscription();
    } catch (error) {
      console.error("Error in document processing:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      toast({
        title: "Processing error",
        description: errorMessage,
        variant: "destructive"
      });
      
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
    toast({
      title: "Schema updated",
      description: "Your schema has been updated based on your feedback."
    });
  };

  const viewResults = () => {
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
        <div className="w-[88px]"></div>
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
            documentDetails={documentDetails}
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
