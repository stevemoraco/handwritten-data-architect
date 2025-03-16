import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Document, DocumentSchema, DocumentPipeline, ProcessingLog } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface DocumentContextType {
  documents: Document[];
  schemas: DocumentSchema[];
  pipelines: DocumentPipeline[];
  logs: ProcessingLog[];
  addDocument: (document: Partial<Document>) => Promise<Document>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  addSchema: (schema: Partial<DocumentSchema>) => Promise<DocumentSchema>;
  updateSchema: (id: string, updates: Partial<DocumentSchema>) => Promise<DocumentSchema>;
  deleteSchema: (id: string) => Promise<void>;
  addPipeline: (pipeline: Partial<DocumentPipeline>) => Promise<DocumentPipeline>;
  updatePipeline: (id: string, updates: Partial<DocumentPipeline>) => Promise<DocumentPipeline>;
  deletePipeline: (id: string) => Promise<void>;
  addLog: (log: Partial<ProcessingLog>) => Promise<ProcessingLog>;
  clearLogs: () => Promise<void>;
  convertPdfToImages: (documentId: string) => Promise<string[]>;
  processDocumentText: (documentId: string) => Promise<string>;
  generateSchema: (documentIds: string[]) => Promise<DocumentSchema>;
  processDocumentData: (documentId: string, schemaId: string) => Promise<void>;
  isProcessing: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};

interface DocumentProviderProps {
  children: ReactNode;
}

export function DocumentProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [schemas, setSchemas] = useState<DocumentSchema[]>([]);
  const [pipelines, setPipelines] = useState<DocumentPipeline[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const storedDocuments = localStorage.getItem('documents');
      const storedSchemas = localStorage.getItem('schemas');
      const storedPipelines = localStorage.getItem('pipelines');
      const storedLogs = localStorage.getItem('logs');

      if (storedDocuments) setDocuments(JSON.parse(storedDocuments));
      if (storedSchemas) setSchemas(JSON.parse(storedSchemas));
      if (storedPipelines) setPipelines(JSON.parse(storedPipelines));
      if (storedLogs) setLogs(JSON.parse(storedLogs));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('documents', JSON.stringify(documents));
      localStorage.setItem('schemas', JSON.stringify(schemas));
      localStorage.setItem('pipelines', JSON.stringify(pipelines));
      localStorage.setItem('logs', JSON.stringify(logs));
    }
  }, [documents, schemas, pipelines, logs, user]);

  const addDocument = async (document: Partial<Document>): Promise<Document> => {
    if (!user) throw new Error('User must be logged in');
    
    const newDocument: Document = {
      id: uuidv4(),
      name: document.name || 'Untitled Document',
      type: document.type || 'pdf',
      status: document.status || 'uploaded',
      url: document.url || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user.id,
      organizationId: user.organizationId,
      ...document,
    };
    
    setDocuments((prev) => [...prev, newDocument]);
    return newDocument;
  };

  const updateDocument = async (id: string, updates: Partial<Document>): Promise<Document> => {
    const updated = { ...updates, updatedAt: new Date().toISOString() };
    
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id ? { ...doc, ...updated } : doc
      )
    );
    
    const updatedDocument = documents.find((doc) => doc.id === id);
    if (!updatedDocument) throw new Error('Document not found');
    
    return { ...updatedDocument, ...updated };
  };

  const deleteDocument = async (id: string): Promise<void> => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const addSchema = async (schema: Partial<DocumentSchema>): Promise<DocumentSchema> => {
    if (!user) throw new Error('User must be logged in');
    
    const newSchema: DocumentSchema = {
      id: uuidv4(),
      name: schema.name || 'Untitled Schema',
      structure: schema.structure || [],
      description: schema.description || '',
      rationale: schema.rationale || '',
      suggestions: schema.suggestions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationId: user.organizationId,
      ...schema,
    };
    
    setSchemas((prev) => [...prev, newSchema]);
    return newSchema;
  };

  const updateSchema = async (id: string, updates: Partial<DocumentSchema>): Promise<DocumentSchema> => {
    const updated = { ...updates, updatedAt: new Date().toISOString() };
    
    setSchemas((prev) =>
      prev.map((schema) =>
        schema.id === id ? { ...schema, ...updated } : schema
      )
    );
    
    const updatedSchema = schemas.find((schema) => schema.id === id);
    if (!updatedSchema) throw new Error('Schema not found');
    
    return { ...updatedSchema, ...updated };
  };

  const deleteSchema = async (id: string): Promise<void> => {
    setSchemas((prev) => prev.filter((schema) => schema.id !== id));
  };

  const addPipeline = async (pipeline: Partial<DocumentPipeline>): Promise<DocumentPipeline> => {
    if (!user) throw new Error('User must be logged in');
    
    const newPipeline: DocumentPipeline = {
      id: uuidv4(),
      name: pipeline.name || 'Untitled Pipeline',
      description: pipeline.description || '',
      documentCount: pipeline.documentCount || 0,
      status: pipeline.status || 'active',
      progressCount: pipeline.progressCount || 0,
      schemaId: pipeline.schemaId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organizationId: user.organizationId,
      ...pipeline,
    };
    
    setPipelines((prev) => [...prev, newPipeline]);
    return newPipeline;
  };

  const updatePipeline = async (id: string, updates: Partial<DocumentPipeline>): Promise<DocumentPipeline> => {
    const updated = { ...updates, updatedAt: new Date().toISOString() };
    
    setPipelines((prev) =>
      prev.map((pipeline) =>
        pipeline.id === id ? { ...pipeline, ...updated } : pipeline
      )
    );
    
    const updatedPipeline = pipelines.find((pipeline) => pipeline.id === id);
    if (!updatedPipeline) throw new Error('Pipeline not found');
    
    return { ...updatedPipeline, ...updated };
  };

  const deletePipeline = async (id: string): Promise<void> => {
    setPipelines((prev) => prev.filter((pipeline) => pipeline.id !== id));
  };

  const addLog = async (log: Partial<ProcessingLog>): Promise<ProcessingLog> => {
    const newLog: ProcessingLog = {
      id: uuidv4(),
      documentId: log.documentId || '',
      pipelineId: log.pipelineId,
      action: log.action || '',
      status: log.status || 'success',
      message: log.message || '',
      timestamp: new Date().toISOString(),
      ...log,
    };
    
    setLogs((prev) => [...prev, newLog]);
    return newLog;
  };

  const clearLogs = async (): Promise<void> => {
    setLogs([]);
  };

  const convertPdfToImages = async (documentId: string) => {
    if (!user) {
      throw new Error("User must be authenticated to convert documents");
    }

    try {
      const { data: document, error: documentError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (documentError) {
        throw new Error(`Failed to fetch document: ${documentError.message}`);
      }

      if (!document) {
        throw new Error("Document not found");
      }

      const { data: result, error: processingError } = await supabase.functions
        .invoke("pdf-to-images", {
          body: { documentId, userId: user.id }
        });

      if (processingError) {
        throw new Error(`Failed to process document: ${processingError.message}`);
      }

      return result;
    } catch (error) {
      console.error("Error converting PDF to images:", error);
      throw error;
    }
  };

  const processDocumentText = async (documentId: string): Promise<string> => {
    setIsProcessing(true);
    try {
      await addLog({
        documentId,
        action: 'Process Document Text',
        status: 'success',
        message: 'Started document text extraction',
      });

      // This would be replaced with actual API call to Gemini
      const document = documents.find((doc) => doc.id === documentId);
      if (!document) throw new Error('Document not found');

      // Mock text extraction
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const transcription = `# Medical Questionnaire
      
## Patient Information
- **Name**: John Smith
- **Date of Birth**: 05/12/1975
- **Patient ID**: 12345678

## Medical History
- Previous surgeries: None
- Allergies: Penicillin
- Current medications: Lisinopril 10mg daily

## Current Symptoms
- Headache: Yes (3 days)
- Fever: No
- Fatigue: Yes (1 week)
- Shortness of breath: No

## Family History
- Diabetes: Mother
- Heart disease: Father
- Cancer: None

## Lifestyle
- Smoking: No
- Alcohol consumption: Occasional
- Exercise frequency: 2-3 times per week
`;
      
      const updatedDoc = await updateDocument(documentId, {
        transcription,
      });
      
      await addLog({
        documentId,
        action: 'Process Document Text',
        status: 'success',
        message: 'Successfully extracted document text',
      });
      
      return transcription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await addLog({
        documentId,
        action: 'Process Document Text',
        status: 'error',
        message: `Failed to extract text: ${errorMessage}`,
      });
      
      toast({
        title: 'Text extraction failed',
        description: `Failed to extract text from document: ${errorMessage}`,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSchema = async (documentIds: string[]): Promise<DocumentSchema> => {
    setIsProcessing(true);
    try {
      // Log the start of schema generation
      await Promise.all(
        documentIds.map((id) =>
          addLog({
            documentId: id,
            action: 'Generate Schema',
            status: 'success',
            message: 'Started schema generation',
          })
        )
      );

      // This would be replaced with actual API call to Gemini
      const docsToProcess = documents.filter((doc) => documentIds.includes(doc.id));
      if (docsToProcess.length === 0) throw new Error('No documents found');

      // Mock schema generation
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Create a mock schema based on medical questionnaire
      const newSchema: Partial<DocumentSchema> = {
        name: 'Medical Questionnaire Schema',
        description: 'A schema for processing medical questionnaire documents',
        rationale: 'This schema is structured to capture all the common fields in medical questionnaires while accommodating variations in question format and handwritten answers.',
        structure: [
          {
            id: uuidv4(),
            name: 'Patient Information',
            description: 'Basic patient identifiers and demographic information',
            displayOrder: 1,
            fields: [
              {
                id: uuidv4(),
                name: 'Full Name',
                description: 'Patient\'s full legal name',
                type: 'string',
                required: true,
                displayOrder: 1
              },
              {
                id: uuidv4(),
                name: 'Date of Birth',
                description: 'Patient\'s date of birth',
                type: 'date',
                required: true,
                displayOrder: 2
              },
              {
                id: uuidv4(),
                name: 'Patient ID',
                description: 'Medical record or patient identifier',
                type: 'string',
                required: true,
                displayOrder: 3
              },
              {
                id: uuidv4(),
                name: 'Gender',
                description: 'Patient\'s gender identity',
                type: 'enum',
                enumValues: ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'],
                required: true,
                displayOrder: 4
              }
            ]
          },
          {
            id: uuidv4(),
            name: 'Medical History',
            description: 'Patient\'s prior medical conditions and treatments',
            displayOrder: 2,
            fields: [
              {
                id: uuidv4(),
                name: 'Previous Surgeries',
                description: 'List of previous surgical procedures',
                type: 'string',
                required: false,
                displayOrder: 1
              },
              {
                id: uuidv4(),
                name: 'Allergies',
                description: 'Known allergies to medications or substances',
                type: 'string',
                required: true,
                displayOrder: 2
              },
              {
                id: uuidv4(),
                name: 'Current Medications',
                description: 'Current prescription and non-prescription medications',
                type: 'string',
                required: true,
                displayOrder: 3
              }
            ]
          },
          {
            id: uuidv4(),
            name: 'Current Symptoms',
            description: 'Present symptoms and duration',
            displayOrder: 3,
            fields: [
              {
                id: uuidv4(),
                name: 'Headache',
                description: 'Presence and duration of headache',
                type: 'string',
                required: false,
                displayOrder: 1
              },
              {
                id: uuidv4(),
                name: 'Fever',
                description: 'Presence and duration of fever',
                type: 'string',
                required: false,
                displayOrder: 2
              },
              {
                id: uuidv4(),
                name: 'Fatigue',
                description: 'Presence and duration of fatigue',
                type: 'string',
                required: false,
                displayOrder: 3
              },
              {
                id: uuidv4(),
                name: 'Shortness of Breath',
                description: 'Presence and severity of breathing difficulty',
                type: 'string',
                required: false,
                displayOrder: 4
              }
            ]
          },
          {
            id: uuidv4(),
            name: 'Family History',
            description: 'Family medical history of significant conditions',
            displayOrder: 4,
            fields: [
              {
                id: uuidv4(),
                name: 'Diabetes',
                description: 'Family history of diabetes',
                type: 'string',
                required: false,
                displayOrder: 1
              },
              {
                id: uuidv4(),
                name: 'Heart Disease',
                description: 'Family history of heart disease',
                type: 'string',
                required: false,
                displayOrder: 2
              },
              {
                id: uuidv4(),
                name: 'Cancer',
                description: 'Family history of cancer',
                type: 'string',
                required: false,
                displayOrder: 3
              }
            ]
          },
          {
            id: uuidv4(),
            name: 'Lifestyle',
            description: 'Patient lifestyle factors affecting health',
            displayOrder: 5,
            fields: [
              {
                id: uuidv4(),
                name: 'Smoking',
                description: 'Smoking status and frequency',
                type: 'string',
                required: true,
                displayOrder: 1
              },
              {
                id: uuidv4(),
                name: 'Alcohol Consumption',
                description: 'Alcohol consumption pattern',
                type: 'string',
                required: true,
                displayOrder: 2
              },
              {
                id: uuidv4(),
                name: 'Exercise Frequency',
                description: 'Regular physical activity frequency',
                type: 'string',
                required: true,
                displayOrder: 3
              }
            ]
          }
        ],
        suggestions: [
          {
            id: uuidv4(),
            description: 'Add a "Consent" table to capture patient consent information',
            type: 'add',
            impact: 'Better compliance with healthcare regulations'
          },
          {
            id: uuidv4(),
            description: 'Expand "Current Symptoms" to include pain scale ratings',
            type: 'modify',
            impact: 'More consistent quantification of subjective symptoms'
          },
          {
            id: uuidv4(),
            description: 'Add vaccination history to Medical History section',
            type: 'add',
            impact: 'Important for comprehensive preventive care assessment'
          },
          {
            id: uuidv4(),
            description: 'Add emergency contact information to Patient Information',
            type: 'add',
            impact: 'Critical for emergency situations'
          },
          {
            id: uuidv4(),
            description: 'Add a field for electronic signature in a new Signature section',
            type: 'add',
            impact: 'Ensures documentation of patient verification'
          }
        ]
      };
      
      const schema = await addSchema(newSchema);
      
      // Log success for all documents
      await Promise.all(
        documentIds.map((id) =>
          addLog({
            documentId: id,
            action: 'Generate Schema',
            status: 'success',
            message: 'Successfully generated schema',
          })
        )
      );
      
      return schema;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failure for all documents
      await Promise.all(
        documentIds.map((id) =>
          addLog({
            documentId: id,
            action: 'Generate Schema',
            status: 'error',
            message: `Failed to generate schema: ${errorMessage}`,
          })
        )
      );
      
      toast({
        title: 'Schema generation failed',
        description: `Failed to generate schema: ${errorMessage}`,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const processDocumentData = async (documentId: string, schemaId: string): Promise<void> => {
    setIsProcessing(true);
    try {
      await addLog({
        documentId,
        action: 'Process Document Data',
        status: 'success',
        message: 'Started document data extraction',
      });

      // This would be replaced with actual API call to Gemini
      const document = documents.find((doc) => doc.id === documentId);
      if (!document) throw new Error('Document not found');
      
      const schema = schemas.find((s) => s.id === schemaId);
      if (!schema) throw new Error('Schema not found');

      // Mock data extraction process
      await new Promise((resolve) => setTimeout(resolve, 2500));
      
      await addLog({
        documentId,
        action: 'Process Document Data',
        status: 'success',
        message: 'Successfully extracted document data according to schema',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await addLog({
        documentId,
        action: 'Process Document Data',
        status: 'error',
        message: `Failed to extract data: ${errorMessage}`,
      });
      
      toast({
        title: 'Data extraction failed',
        description: `Failed to extract data from document: ${errorMessage}`,
        variant: 'destructive',
      });
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const value = {
    documents,
    schemas,
    pipelines,
    logs,
    addDocument,
    updateDocument,
    deleteDocument,
    addSchema,
    updateSchema,
    deleteSchema,
    addPipeline,
    updatePipeline,
    deletePipeline,
    addLog,
    clearLogs,
    convertPdfToImages,
    processDocumentText,
    generateSchema,
    processDocumentData,
    isProcessing,
  };

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}
