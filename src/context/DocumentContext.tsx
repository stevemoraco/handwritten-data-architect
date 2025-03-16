
import { createContext, useContext, useState, ReactNode } from "react";
import { Document } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

interface DocumentContextProps {
  documents: Document[];
  isLoading: boolean;
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  convertPdfToImages: (documentId: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextProps | undefined>(undefined);

export function DocumentProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const addDocument = (document: Document) => {
    setDocuments((prev) => [...prev, document]);
  };

  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
    );
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
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
      setIsLoading(true);
      
      // First update the document status to processing
      updateDocument(documentId, { status: "processing" });
      
      // Log the start of the process
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: "PDF Conversion Retry",
        status: "success",
        message: `Starting PDF to images conversion process for document ${documentId}`
      });
      
      // Call the PDF to images function
      const { data, error } = await supabase.functions.invoke('pdf-to-images', {
        body: { documentId, userId: user.id }
      });
      
      if (error) {
        throw new Error(`Failed to convert PDF: ${error.message}`);
      }
      
      if (!data.success) {
        throw new Error(data.error || "Unknown error in PDF conversion");
      }
      
      // Update the document with the results
      updateDocument(documentId, { 
        status: "processed",
        pageCount: data.pageCount,
        thumbnails: data.thumbnails
      });
      
      toast({
        title: "Conversion complete",
        description: `Successfully converted ${data.pageCount} pages to images`,
      });
    } catch (error) {
      console.error("Error in PDF conversion:", error);
      
      // Update the document status to failed
      updateDocument(documentId, { 
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error"
      });
      
      // Log the error
      await supabase.from("processing_logs").insert({
        document_id: documentId,
        action: "PDF Conversion Error",
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
      
      toast({
        title: "Conversion failed",
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
        isLoading,
        setDocuments,
        addDocument,
        updateDocument,
        removeDocument,
        convertPdfToImages,
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
