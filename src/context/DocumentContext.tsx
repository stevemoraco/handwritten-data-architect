
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Document, DocumentSchema, ProcessingLog } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

interface DocumentContextProps {
  documents: Document[];
  schemas: DocumentSchema[];
  isLoading: boolean;
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => Promise<void>;
  removeBatchDocuments: (ids: string[]) => Promise<void>;
  convertPdfToImages: (documentId: string) => Promise<void>;
  fetchUserDocuments: () => Promise<void>;
  processDocumentText: (documentId: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextProps | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [schemas, setSchemas] = useState<DocumentSchema[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserDocuments();
      fetchUserSchemas();
    }
  }, [user]);

  const fetchUserDocuments = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      // Transform the database records to match the Document type
      const documentsList: Document[] = data.map((doc) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type as "pdf" | "image",
        status: doc.status as "uploaded" | "processing" | "processed" | "failed",
        url: doc.original_url || "",
        thumbnails: [],
        pageCount: doc.page_count || 0,
        transcription: doc.transcription,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        userId: doc.user_id,
        organizationId: doc.pipeline_id, // Use pipeline_id instead of organization_id
        pipelineId: doc.pipeline_id,
        processing_progress: doc.processing_progress,
        error: doc.processing_error
      }));

      // Fetch thumbnails for each document
      for (const doc of documentsList) {
        try {
          const { data: pages, error: pagesError } = await supabase
            .from("document_pages")
            .select("image_url, page_number")
            .eq("document_id", doc.id)
            .order("page_number", { ascending: true });

          if (pagesError) {
            console.error(`Error fetching thumbnails for doc ${doc.id}:`, pagesError);
            continue;
          }

          if (pages && pages.length > 0) {
            // Filter out any null or undefined URLs
            doc.thumbnails = pages
              .map(page => page.image_url)
              .filter(url => !!url);
              
            console.log(`Loaded ${doc.thumbnails.length} thumbnails for document ${doc.id}`);
          }
        } catch (err) {
          console.error(`Failed to load thumbnails for doc ${doc.id}:`, err);
        }
      }

      setDocuments(documentsList);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserSchemas = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("document_schemas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching schemas:", error);
        return;
      }

      // Transform the database records to match the DocumentSchema type
      const schemasList: DocumentSchema[] = data ? data.map(schema => ({
        id: schema.id,
        name: schema.name,
        structure: schema.structure as any,
        description: schema.description || "",
        rationale: schema.rationale || "",
        suggestions: schema.suggestions as any[] || [],
        createdAt: schema.created_at,
        updatedAt: schema.updated_at,
        organizationId: schema.organization_id || ""
      })) : [];
      
      setSchemas(schemasList);
    } catch (error) {
      console.error("Error fetching schemas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addDocument = (document: Document) => {
    setDocuments((prev) => [...prev, document]);
  };

  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
    );
  };

  const removeDocument = async (id: string) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);
      
      if (error) {
        throw new Error(`Failed to delete document: ${error.message}`);
      }
      
      // Delete document pages
      await supabase
        .from("document_pages")
        .delete()
        .eq("document_id", id);
      
      // Delete document files from storage
      // Note: In a production app, you might want to use a background job for this
      if (user) {
        await supabase.storage
          .from("document_files")
          .remove([`${user.id}/${id}/`]);
      }
      
      // Update state
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
      throw error;
    }
  };
  
  const removeBatchDocuments = async (ids: string[]) => {
    if (!ids.length) return;
    
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from("documents")
        .delete()
        .in("id", ids);
      
      if (error) {
        throw new Error(`Failed to delete documents: ${error.message}`);
      }
      
      // Delete document pages
      await supabase
        .from("document_pages")
        .delete()
        .in("document_id", ids);
      
      // Delete document files from storage
      if (user) {
        for (const id of ids) {
          await supabase.storage
            .from("document_files")
            .remove([`${user.id}/${id}/`]);
        }
      }
      
      // Update state
      setDocuments((prev) => prev.filter((doc) => !ids.includes(doc.id)));
      
      toast({
        title: "Documents Deleted",
        description: `Successfully deleted ${ids.length} document(s)`,
      });
      
    } catch (error) {
      console.error("Error batch deleting documents:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete documents",
        variant: "destructive",
      });
      throw error;
    }
  };

  const convertPdfToImages = async (documentId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to process documents",
        variant: "destructive",
      });
      return;
    }

    try {
      // First update the document status to processing
      updateDocument(documentId, { 
        status: "processing",
        processing_progress: 0,
        error: null 
      });
      
      // Update the status in the database
      await supabase
        .from("documents")
        .update({
          status: "processing",
          processing_progress: 0,
          processing_error: null
        })
        .eq("id", documentId);
      
      // Log the start of the process
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: "PDF Conversion Retry",
        status: "success",
        message: `Starting PDF to images conversion process for document ${documentId}`
      });
      
      // Set up a subscription to track progress
      const conversionSubscription = supabase
        .channel(`document-conversion-${documentId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'documents',
          filter: `id=eq.${documentId}` 
        }, (payload) => {
          console.log("Document update received:", payload);
          
          // Update the local state with the progress
          updateDocument(documentId, { 
            status: payload.new.status,
            processing_progress: payload.new.processing_progress,
            error: payload.new.processing_error
          });
        })
        .subscribe();
      
      // Call the PDF to images function
      const { data, error } = await supabase.functions.invoke('pdf-to-images', {
        body: { documentId, userId: user.id }
      });
      
      // Unsubscribe from the channel after a delay
      setTimeout(() => {
        conversionSubscription.unsubscribe();
      }, 60000); // Keep subscription for 1 minute
      
      if (error) {
        console.error("Error invoking pdf-to-images function:", error);
        throw new Error(`Failed to convert PDF: ${error.message}`);
      }
      
      if (!data || !data.success) {
        console.error("PDF conversion returned error:", data?.error || "Unknown error");
        throw new Error(data?.error || "Unknown error in PDF conversion");
      }
      
      // Refresh the documents list after a short delay
      setTimeout(() => {
        fetchUserDocuments();
      }, 2000);
      
    } catch (error) {
      console.error("Error in PDF conversion:", error);
      
      // Update the document status to failed
      updateDocument(documentId, { 
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
      
      // Update the status in the database
      await supabase
        .from("documents")
        .update({
          status: "failed",
          processing_error: error instanceof Error ? error.message : "Unknown error"
        })
        .eq("id", documentId);
      
      // Log the error
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: "PDF Conversion Error",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
      
      throw error;
    }
  };

  const processDocumentText = async (documentId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to process documents",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Update document status
      updateDocument(documentId, { status: "processing" });
      
      // Update the status in the database
      await supabase
        .from("documents")
        .update({
          status: "processing"
        })
        .eq("id", documentId);
      
      // Log the start of the process
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: "Text Transcription",
        status: "success",
        message: `Starting text transcription for document ${documentId}`
      });
      
      // Instead of calling the process-document function, let's directly update the transcription
      // using data we already have from the document_pages table
      const { data: pages, error: pagesError } = await supabase
        .from("document_pages")
        .select("text_content")
        .eq("document_id", documentId)
        .order("page_number", { ascending: true });
      
      if (pagesError) {
        throw new Error(`Failed to fetch document pages: ${pagesError.message}`);
      }
      
      // Combine all page text contents
      const transcription = pages
        .map(page => page.text_content)
        .filter(Boolean)
        .join("\n\n");
      
      // Update the document with the transcription
      updateDocument(documentId, { 
        status: "processed",
        transcription: transcription
      });
      
      // Update the transcription in the database
      await supabase
        .from("documents")
        .update({
          status: "processed",
          transcription: transcription
        })
        .eq("id", documentId);
      
      toast({
        title: "Transcription complete",
        description: "Successfully transcribed document text",
      });
      
      // Refresh the documents list
      await fetchUserDocuments();
    } catch (error) {
      console.error("Error processing document text:", error);
      
      // Update the document status to failed
      updateDocument(documentId, { 
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
      
      // Update the status in the database
      await supabase
        .from("documents")
        .update({
          status: "failed",
          processing_error: error instanceof Error ? error.message : "Unknown error"
        })
        .eq("id", documentId);
      
      // Log the error
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: "Text Transcription Error",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
      
      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DocumentContext.Provider
      value={{
        documents,
        schemas,
        isLoading,
        setDocuments,
        addDocument,
        updateDocument,
        removeDocument,
        removeBatchDocuments,
        convertPdfToImages,
        fetchUserDocuments,
        processDocumentText
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error("useDocuments must be used within a DocumentProvider");
  }
  return context;
};
