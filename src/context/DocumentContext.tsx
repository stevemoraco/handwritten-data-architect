
import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Document, DocumentSchema } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DocumentContextType {
  documents: Document[];
  schemas: DocumentSchema[];
  isLoading: boolean;
  fetchError: Error | null;
  fetchUserDocuments: () => Promise<void>;
  removeBatchDocuments: (documentIds: string[]) => Promise<void>;
  removeSingleDocument: (documentId: string) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
  convertPdfToImages: (documentId: string) => Promise<void>;
  processDocumentText: (documentId: string) => Promise<void>;
}

const DocumentContext = React.createContext<DocumentContextType>({
  documents: [],
  schemas: [],
  isLoading: false,
  fetchError: null,
  fetchUserDocuments: async () => {},
  removeBatchDocuments: async () => {},
  removeSingleDocument: async () => {},
  removeDocument: async () => {},
  convertPdfToImages: async () => {},
  processDocumentText: async () => {},
});

export const useDocuments = () => React.useContext(DocumentContext);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [schemas, setSchemas] = React.useState<DocumentSchema[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [errorShown, setErrorShown] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      fetchUserDocuments();
    } else {
      setDocuments([]);
    }
  }, [user]);

  const fetchUserDocuments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }
      
      if (!data) {
        setDocuments([]);
        return;
      }
      
      console.log("Fetched documents:", data.length);
      
      const processedDocs: Document[] = await Promise.all(
        data.map(async (doc) => {
          // First fetch pages to get thumbnails and page count
          const { data: pages, error: pagesError } = await supabase
            .from("document_pages")
            .select("image_url")
            .eq("document_id", doc.id)
            .order("page_number", { ascending: true });
          
          console.log(`Document ${doc.id} ${doc.name} page fetch:`, !pagesError ? "success" : "error", pages?.length || 0);
          
          // Get thumbnails from pages
          const thumbnails = !pagesError && pages ? pages.map(page => page.image_url).filter(Boolean) : [];
          
          // Determine document URL, trying multiple sources
          let docUrl = doc.original_url || "";
          
          if (!docUrl && doc.user_id) {
            try {
              // Try to get URL from storage using ID-based path
              const pathWithId = `${doc.user_id}/${doc.id}/original${doc.type === 'pdf' ? '.pdf' : ''}`;
              const { data: urlData } = supabase.storage
                .from("document_files")
                .getPublicUrl(pathWithId);
              
              if (urlData?.publicUrl) {
                docUrl = urlData.publicUrl;
                
                // Update the document with the found URL
                await supabase
                  .from("documents")
                  .update({ original_url: docUrl })
                  .eq("id", doc.id);
              }
            } catch (e) {
              console.error("Error getting document URL:", e);
            }
          }

          // Update the page count if we have thumbnails but no page_count in the document
          const pageCount = doc.page_count || thumbnails.length || 0;
          if (thumbnails.length > 0 && (!doc.page_count || doc.page_count === 0)) {
            try {
              await supabase
                .from("documents")
                .update({ page_count: thumbnails.length })
                .eq("id", doc.id);
            } catch (updateError) {
              console.error("Error updating page count:", updateError);
            }
          }
          
          return {
            id: doc.id,
            name: doc.name,
            type: doc.type as "pdf" | "image",
            status: doc.status as "uploaded" | "processing" | "processed" | "failed",
            url: docUrl,
            original_url: doc.original_url || "",
            thumbnails,
            pageCount: pageCount,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
            userId: doc.user_id,
            organizationId: null,
            pipelineId: doc.pipeline_id,
            processing_error: doc.processing_error,
            processing_progress: doc.processing_progress,
            transcription: doc.transcription,
          };
        })
      );
      
      setDocuments(processedDocs);
      setFetchError(null);
      setErrorShown(false);
      
      console.log("Processed documents:", processedDocs.length);
      processedDocs.forEach(doc => {
        console.log(`Document ${doc.id} "${doc.name}": ${doc.thumbnails.length} thumbnails, ${doc.pageCount} pages`);
      });
    } catch (error) {
      console.error("Error fetching documents:", error);
      setFetchError(error instanceof Error ? error : new Error("Unknown error fetching documents"));
      
      if (!errorShown) {
        setErrorShown(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeBatchDocuments = async (documentIds: string[]) => {
    if (!user || documentIds.length === 0) return;
    
    try {
      const { error } = await supabase
        .from("documents")
        .delete()
        .in("id", documentIds);
        
      if (error) {
        throw new Error(`Failed to delete documents: ${error.message}`);
      }
      
      setDocuments(prevDocs => prevDocs.filter(doc => !documentIds.includes(doc.id)));
    } catch (error) {
      console.error("Error deleting documents:", error);
      throw error;
    }
  };

  const removeSingleDocument = async (documentId: string) => {
    await removeBatchDocuments([documentId]);
  };
  
  const removeDocument = async (documentId: string) => {
    await removeSingleDocument(documentId);
  };

  const convertPdfToImages = async (documentId: string) => {
    if (!user) return;
    
    try {
      // Update the document status to processing
      await supabase
        .from("documents")
        .update({
          status: "processing",
          processing_progress: 10
        })
        .eq("id", documentId);
      
      // Call the pdf-to-images edge function
      const { data, error } = await supabase.functions.invoke('pdf-to-images', {
        body: { documentId, userId: user.id }
      });
      
      if (error) {
        console.error("Error converting PDF:", error);
        throw new Error(`Failed to convert PDF: ${error.message}`);
      }
      
      // Refresh the documents list to get the updated thumbnails
      await fetchUserDocuments();
      
      return data;
    } catch (error) {
      console.error("Error in PDF conversion:", error);
      
      // Update the document status to failed
      await supabase
        .from("documents")
        .update({
          status: "failed",
          processing_error: error instanceof Error ? error.message : "Unknown error during conversion"
        })
        .eq("id", documentId);
      
      throw error;
    }
  };

  const processDocumentText = async (documentId: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from("documents")
        .update({
          status: "processing",
          processing_progress: 20
        })
        .eq("id", documentId);
      
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: { documentId }
      });
      
      if (error) {
        console.error("Error processing document text:", error);
        throw new Error(`Failed to process document text: ${error.message}`);
      }
      
      await fetchUserDocuments();
      
      return data;
    } catch (error) {
      console.error("Error in document text processing:", error);
      
      await supabase
        .from("documents")
        .update({
          status: "failed",
          processing_error: error instanceof Error ? error.message : "Unknown error during text processing"
        })
        .eq("id", documentId);
      
      throw error;
    }
  };
  
  return (
    <DocumentContext.Provider
      value={{
        documents,
        schemas,
        isLoading,
        fetchError,
        fetchUserDocuments,
        removeBatchDocuments,
        removeSingleDocument,
        removeDocument,
        convertPdfToImages,
        processDocumentText,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};
