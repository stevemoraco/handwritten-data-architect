
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { DocumentUpload } from "@/components/document/DocumentUpload";
import { ProcessingSteps } from "@/components/document/ProcessingSteps";
import { SchemaDetail } from "@/components/schema/SchemaDetail";
import { SchemaChat } from "@/components/schema/SchemaChat";
import { AIProcessingStep, DocumentSchema } from "@/types";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Layers, MessageSquare } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { buildSchemaGenerationPrompt, buildTranscriptionPrompt, processWithGemini } from "@/services/geminiService";

export default function DocumentProcess() {
  const navigate = useNavigate();
  const { documents, schemas, addSchema, generateSchema } = useDocuments();
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

  const handleDocumentsUploaded = (documentIds: string[]) => {
    setUploadedDocumentIds(documentIds);
    
    // Update step status
    updateStepStatus("Document Upload", "completed");
    
    // Auto-navigate to the next step
    setActiveTab("process");
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
    try {
      // Process each document for transcription
      updateStepStatus("Document Transcription", "in_progress", 0);
      
      for (let i = 0; i < uploadedDocumentIds.length; i++) {
        const documentId = uploadedDocumentIds[i];
        const document = documents.find(doc => doc.id === documentId);
        
        if (document) {
          const prompt = buildTranscriptionPrompt(document);
          // Here we would call the real Gemini API
          await processWithGemini(prompt);
          
          const progress = ((i + 1) / uploadedDocumentIds.length) * 100;
          updateStepStatus("Document Transcription", "in_progress", progress);
        }
      }
      
      updateStepStatus("Document Transcription", "completed");
      
      // Generate schema from transcribed documents
      updateStepStatus("Schema Generation", "in_progress", 0);
      
      const docsToProcess = documents.filter(doc => uploadedDocumentIds.includes(doc.id));
      const prompt = buildSchemaGenerationPrompt(docsToProcess);
      
      // Simulate schema generation
      const schema = await generateSchema(uploadedDocumentIds);
      setGeneratedSchema(schema);
      
      updateStepStatus("Schema Generation", "completed");
      updateStepStatus("Schema Refinement", "in_progress");
      
      // Auto-navigate to schema review
      setActiveTab("schema");
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
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
  };

  const handleSchemaModify = () => {
    setActiveTab("chat");
  };

  const handleSchemaUpdate = () => {
    // This would be called when the chat suggests schema updates
  };

  const viewResults = () => {
    // Navigate to the results page
    // navigate("/results");
    // For now, just switch to the chat tab
    setActiveTab("chat");
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
