import * as React from "react";
import { useNavigate } from "react-router-dom";
import { DocumentUpload } from "@/components/document/DocumentUpload";
import { ProcessingSteps } from "@/components/document/ProcessingSteps";
import { SchemaDetail } from "@/components/schema/SchemaDetail";
import { SchemaChat } from "@/components/schema/SchemaChat";
import { 
  AIProcessingStep, 
  DocumentSchema, 
  SchemaSuggestion 
} from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  FileText, 
  Layers, 
  MessageSquare, 
  AlertCircle 
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { 
  transcribeDocument, 
  generateSchema, 
  extractDocumentData
} from "@/services/documentService";

const generateRealisticPages = (doc: any) => {
  const pageCount = doc.page_count || Math.max(1, Math.ceil(doc.size / 50000));
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
  const { user, isLoading } = useAuth();
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
  const [authCheckComplete, setAuthCheckComplete] = React.useState(false);
  const [extractedData, setExtractedData] = React.useState<any | null>(null);
  const [processingError, setProcessingError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const checkAuth = async () => {
      if (!isLoading) {
        setAuthCheckComplete(true);
        
        if (!user) {
          console.log("Auth check: User not authenticated");
          toast({
            title: "Authentication required",
            description: "Please log in to access this page",
            variant: "destructive"
          });
          navigate("/");
        } else {
          console.log("Auth check: User authenticated", user.email);
        }
      } else {
        timer = setTimeout(() => {
          setAuthCheckComplete(true);
          console.log("Auth check timed out");
        }, 5000);
      }
    };

    checkAuth();
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user, isLoading, navigate, toast]);

  React.useEffect(() => {
    if (!uploadedDocumentIds.length) return;

    const subscription = supabase
      .channel('document-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'documents',
        filter: `id=in.(${uploadedDocumentIds.join(',')})` 
      }, (payload) => {
        console.log("Document update received:", payload);
        
        setDocumentDetails(prev => 
          prev.map(doc => 
            doc.id === payload.new.id 
              ? { 
                  ...doc, 
                  status: payload.new.status,
                  pageCount: payload.new.page_count || doc.pageCount,
                  processedPages: payload.new.processing_progress 
                    ? Math.floor((payload.new.processing_progress / 100) * (payload.new.page_count || doc.pageCount))
                    : doc.processedPages,
                  error: payload.new.processing_error
                } 
              : doc
          )
        );
      })
      .subscribe();

    const pagesSubscription = supabase
      .channel('document-pages-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'document_pages',
        filter: `document_id=in.(${uploadedDocumentIds.join(',')})` 
      }, (payload) => {
        console.log("Document page added:", payload);
        
        const { document_id, page_number, image_url, text_content } = payload.new;
        
        setDocumentDetails(prev => 
          prev.map(doc => {
            if (doc.id === document_id) {
              const existingPageIndex = doc.pages.findIndex(p => p.pageNumber === page_number);
              
              if (existingPageIndex >= 0) {
                const updatedPages = [...doc.pages];
                updatedPages[existingPageIndex] = {
                  ...updatedPages[existingPageIndex],
                  status: "completed",
                  thumbnail: image_url,
                  text: text_content
                };
                return { ...doc, pages: updatedPages };
              } else {
                return {
                  ...doc,
                  pages: [
                    ...doc.pages,
                    {
                      pageNumber: page_number,
                      status: "completed",
                      thumbnail: image_url,
                      text: text_content
                    }
                  ].sort((a, b) => a.pageNumber - b.pageNumber)
                };
              }
            }
            return doc;
          })
        );
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
      pagesSubscription.unsubscribe();
    };
  }, [uploadedDocumentIds]);

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
        processedDocuments: 0
      }));
      
      const initialDocDetails = documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        pageCount: doc.page_count || 0,
        processedPages: 0,
        status: doc.status || "waiting",
        pages: generateRealisticPages(doc),
        thumbnail: undefined,
        error: doc.processing_error
      }));
      
      setDocumentDetails(initialDocDetails);
      console.log("Documents uploaded successfully:", documents);
      
      setActiveTab("process");
    } catch (error) {
      console.error("Error in document upload handling:", error);
      setProcessingError(error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Error",
        description: `Failed to process uploaded documents: ${error instanceof Error ? error.message : "Unknown error"}`,
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
    
    if (error) {
      setProcessingError(error);
    }
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
    
    if (updates.error) {
      setProcessingError(updates.error);
    }
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
    
    setProcessingError(null);
    
    try {
      await transcribeDocuments();
    } catch (error) {
      console.error("Error in document processing:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setProcessingError(errorMessage);
      
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

  const transcribeDocuments = async () => {
    updateStepStatus("Document Transcription", "in_progress", 0);
    setProcessStats(prev => ({ ...prev, processedDocuments: 0 }));
    
    try {
      for (const doc of documentDetails) {
        console.log(`Starting transcription of document: ${doc.name}`);
        updateDocumentStatus(doc.id, "processing", 0);
        
        try {
          const transcription = await transcribeDocument(doc.id);
          
          if (!transcription) {
            throw new Error("Transcription failed - no content returned");
          }
          
          updateDocumentStatus(doc.id, "completed", doc.pageCount);
          
          setProcessStats(prev => ({
            ...prev,
            processedDocuments: prev.processedDocuments + 1
          }));
          
          const progress = (processStats.processedDocuments / processStats.documentCount) * 100;
          updateStepStatus("Document Transcription", "in_progress", progress);
          
        } catch (error) {
          console.error(`Error transcribing document ${doc.id}:`, error);
          const errorMessage = error instanceof Error ? error.message : "Transcription failed";
          updateDocumentStatus(doc.id, "failed", undefined, errorMessage);
          updateStepStatus("Document Transcription", "failed", undefined, errorMessage);
          throw error;
        }
      }
      
      updateStepStatus("Document Transcription", "completed");
      console.log("Document transcription completed");
      
      await generateDocumentSchema();
      
    } catch (error) {
      console.error("Error in transcribeDocuments:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      updateStepStatus("Document Transcription", "failed", undefined, errorMessage);
      throw error;
    }
  };

  const generateDocumentSchema = async () => {
    updateStepStatus("Schema Generation", "in_progress", 0);
    
    try {
      console.log("Starting schema generation");
      
      setDocumentDetails(prev => 
        prev.map(doc => ({
          ...doc,
          status: "waiting"
        }))
      );
      
      for (const doc of documentDetails) {
        updateDocumentStatus(doc.id, "processing");
      }
      
      console.log("Sending documents to schema generation:", {
        documentIds: uploadedDocumentIds,
        documentDetails: documentDetails.map(d => ({ id: d.id, name: d.name, pageCount: d.pageCount }))
      });
      
      try {
        const schemaResult = await generateSchema(uploadedDocumentIds);
        
        if (!schemaResult) {
          throw new Error("Schema generation failed - no result returned");
        }
        
        let schema;
        try {
          if (typeof schemaResult === 'string') {
            schema = JSON.parse(schemaResult);
          } else {
            schema = schemaResult;
          }
          console.log("Parsed schema:", schema);
        } catch (error) {
          console.error("Error parsing schema:", error);
          throw new Error("Invalid schema format received");
        }
        
        const documentSchema: DocumentSchema = {
          id: uuidv4(),
          name: schema.schema?.name || `Schema for ${documentDetails.length} document(s)`,
          description: schema.schema?.description || "Automatically generated schema",
          structure: (schema.schema?.tables || []).map((table: any, tableIndex: number) => ({
            id: uuidv4(),
            name: table.name,
            description: table.description || "",
            displayOrder: tableIndex + 1,
            fields: (table.fields || []).map((field: any, fieldIndex: number) => ({
              id: uuidv4(),
              name: field.name,
              description: field.description || "",
              type: field.type || "string",
              required: field.required || false,
              enumValues: field.enumValues,
              displayOrder: fieldIndex + 1
            }))
          })),
          rationale: schema.schema?.rationale || "",
          suggestions: (schema.schema?.suggestions || []).map((suggestion: any) => ({
            id: uuidv4(),
            description: suggestion.description,
            type: suggestion.type as "add" | "modify" | "remove",
            impact: suggestion.impact
          })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          organizationId: user?.id || ""
        };
        
        setGeneratedSchema(documentSchema);
        
        setProcessStats(prev => ({
          ...prev,
          schemaDetails: {
            tables: documentSchema.structure.length,
            fields: documentSchema.structure.reduce((count, table) => count + table.fields.length, 0)
          }
        }));
      } catch (error) {
        console.error("Schema generation error:", error);
        throw error;
      }
      
      for (const doc of documentDetails) {
        updateDocumentStatus(doc.id, "completed");
      }
      
      updateStepStatus("Schema Generation", "completed");
      console.log("Schema generation completed");
      
      if (generatedSchema) {
        await prepareSchemaRefinement(generatedSchema);
      } else {
        const defaultSchema: DocumentSchema = {
          id: uuidv4(),
          name: `Schema for ${documentDetails.length} document(s)`,
          description: "Basic generated schema",
          structure: [],
          rationale: "Basic schema due to generation limitations",
          suggestions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          organizationId: user?.id || ""
        };
        setGeneratedSchema(defaultSchema);
        updateStepStatus("Schema Refinement", "in_progress", 50);
        setActiveTab("schema");
      }
    } catch (error) {
      console.error("Error in generateDocumentSchema:", error);
      updateStepStatus("Schema Generation", "failed", undefined, error instanceof Error ? error.message : "Unknown error");
      
      for (const doc of documentDetails) {
        updateDocumentStatus(doc.id, "failed", undefined, error instanceof Error ? error.message : "Schema generation failed");
      }
      
      throw error;
    }
  };

  const prepareSchemaRefinement = async (schema: DocumentSchema) => {
    updateStepStatus("Schema Refinement", "in_progress", 0);
    
    try {
      if (documentDetails.length === 0) {
        throw new Error("No documents available for data extraction");
      }
      
      const exampleDocument = documentDetails[0];
      
      console.log(`Extracting data from document ${exampleDocument.id} based on schema`);
      
      try {
        const extractedResult = await extractDocumentData(exampleDocument.id, schema.id);
        
        if (!extractedResult) {
          throw new Error("No data returned from extraction");
        }
        
        let extractedObject;
        try {
          if (typeof extractedResult === 'string') {
            extractedObject = JSON.parse(extractedResult);
          } else {
            extractedObject = extractedResult;
          }
        } catch (error) {
          console.error("Error parsing extracted data:", error);
          throw new Error("Invalid data format received");
        }
        
        setExtractedData(extractedObject);
        
        updateStepStatus("Schema Refinement", "in_progress", 100);
        console.log("Schema refinement preparation completed");
        
        setActiveTab("schema");
      } catch (error) {
        console.error("Error in data extraction:", error);
        updateStepStatus("Schema Refinement", "in_progress", 50);
        setActiveTab("schema");
      }
      
    } catch (error) {
      console.error("Error in prepareSchemaRefinement:", error);
      updateStepStatus("Schema Refinement", "failed", undefined, error instanceof Error ? error.message : "Unknown error");
      throw error;
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

  if (isLoading && !authCheckComplete) {
    return (
      <div className="container py-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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

      {processingError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-5 w-5 text-destructive mt-1" />
              <div>
                <h3 className="font-medium text-destructive">Processing Error</h3>
                <p className="text-sm text-muted-foreground">{processingError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  extractedData={extractedData}
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
