
import * as React from "react";
import { useAuth } from "@/context/AuthContext";
import { Document } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DocumentContextType {
  documents: Document[];
  isLoading: boolean;
  fetchError: Error | null;
  fetchUserDocuments: () => Promise<void>;
  removeBatchDocuments: (documentIds: string[]) => Promise<void>;
  removeSingleDocument: (documentId: string) => Promise<void>;
}

const DocumentContext = React.createContext<DocumentContextType>({
  documents: [],
  isLoading: false,
  fetchError: null,
  fetchUserDocuments: async () => {},
  removeBatchDocuments: async () => {},
  removeSingleDocument: async () => {},
});

export const useDocuments = () => React.useContext(DocumentContext);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState<Error | null>(null);
  const [errorShown, setErrorShown] = React.useState(false);

  // Fetch documents when user changes
  React.useEffect(() => {
    if (user) {
      fetchUserDocuments();
    } else {
      setDocuments([]);
    }
  }, [user]);

  // Function to fetch user documents
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
      
      // Process document data
      const processedDocs: Document[] = await Promise.all(
        data.map(async (doc) => {
          // Get thumbnails from document pages
          const { data: pages, error: pagesError } = await supabase
            .from("document_pages")
            .select("image_url")
            .eq("document_id", doc.id)
            .order("page_number", { ascending: true });
            
          const thumbnails = !pagesError && pages ? pages.map(page => page.image_url).filter(Boolean) : [];
          
          return {
            id: doc.id,
            name: doc.name,
            type: doc.type as "pdf" | "image",
            status: doc.status as "uploaded" | "processing" | "processed" | "failed",
            url: doc.original_url || "",
            thumbnails,
            pageCount: doc.page_count || 0,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at,
            userId: doc.user_id,
            organizationId: doc.organization_id,
            pipelineId: doc.pipeline_id,
            processingError: doc.processing_error,
          };
        })
      );
      
      setDocuments(processedDocs);
      setFetchError(null);
      setErrorShown(false);
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

  // Function to remove multiple documents
  const removeBatchDocuments = async (documentIds: string[]) => {
    if (!user || documentIds.length === 0) return;
    
    try {
      // Delete document records
      const { error } = await supabase
        .from("documents")
        .delete()
        .in("id", documentIds);
        
      if (error) {
        throw new Error(`Failed to delete documents: ${error.message}`);
      }
      
      // Update state
      setDocuments(prevDocs => prevDocs.filter(doc => !documentIds.includes(doc.id)));
    } catch (error) {
      console.error("Error deleting documents:", error);
      throw error;
    }
  };

  // Function to remove a single document
  const removeSingleDocument = async (documentId: string) => {
    await removeBatchDocuments([documentId]);
  };
  
  return (
    <DocumentContext.Provider
      value={{
        documents,
        isLoading,
        fetchError,
        fetchUserDocuments,
        removeBatchDocuments,
        removeSingleDocument,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};
