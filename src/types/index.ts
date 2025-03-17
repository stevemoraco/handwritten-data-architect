
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  organizationId: string | null;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  ownerId: string;
}

export interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Document {
  id: string;
  name: string;
  type: "pdf" | "image";
  status: "uploaded" | "processing" | "processed" | "failed";
  url: string;
  original_url?: string;
  thumbnails: string[];
  pageCount: number;
  page_count?: number;
  transcription?: string;
  processing_error?: string;
  processing_progress?: number;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  userId: string;
  organizationId?: string | null;
  pipelineId?: string;
}

export interface DocumentSchema {
  id: string;
  name: string;
  structure: SchemaTable[];
  description: string;
  rationale: string;
  suggestions: SchemaSuggestion[];
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

export interface SchemaTable {
  id: string;
  name: string;
  description: string;
  fields: SchemaField[];
  displayOrder: number;
}

export interface SchemaField {
  id: string;
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required: boolean;
  enumValues?: string[];
  displayOrder: number;
}

export interface SchemaSuggestion {
  id: string;
  description: string;
  type: 'add' | 'modify' | 'remove';
  impact: string;
}

export interface DocumentPipeline {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  status: 'active' | 'processing' | 'completed';
  progressCount: number;
  schemaId: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
}

export interface ProcessingLog {
  id: string;
  document_id: string;
  action: string;
  status: "success" | "error" | "warning";
  message?: string;
  created_at: string;
}

export interface DocumentData {
  id: string;
  documentId: string;
  tableId: string;
  fieldId: string;
  value: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  message?: string;
  pagesProcessed?: number;
  pageCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface AIProcessingStep {
  id: string;
  name: string;
  description: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  timestamp: string;
}

export interface GeminiPrompt {
  documentId?: string;
  documentIds?: string[];
  schemaId?: string;
  prompt: string;
  context?: string;
  includeImages?: boolean;
  includeTranscription?: boolean;
}

export interface DocumentPrompt {
  id: string;
  document_id: string;
  prompt_type: string;
  prompt_text: string;
  created_at: string;
}

export interface ProcessingStepsProps {
  steps: AIProcessingStep[];
  onStartProcessing?: () => void;
  onViewResults?: () => void;
  isProcessingComplete: boolean;
  className?: string;
  documentCount?: number;
  processedDocuments?: number;
  schemaDetails?: {
    tables: number;
    fields: number;
  };
  documentDetails?: Array<{
    id: string;
    name: string;
    pageCount: number;
    processedPages: number;
    status: "waiting" | "processing" | "completed" | "failed";
    pages: Array<{
      pageNumber: number;
      status: "waiting" | "processing" | "completed" | "failed";
      thumbnail?: string;
      text?: string;
      error?: string;
    }>;
    thumbnail?: string;
    error?: string;
  }>;
}
