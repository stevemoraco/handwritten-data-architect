
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { DocumentDetail } from "@/components/document/DocumentDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getProcessingLogs } from "@/services/documentService";
import { ProcessingLog } from "@/types";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Document() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { documents, fetchUserDocuments, isLoading } = useDocuments();
  const [logs, setLogs] = React.useState<ProcessingLog[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(true);
  const [documentLoaded, setDocumentLoaded] = React.useState(false);

  const document = React.useMemo(() => {
    const doc = documents.find(doc => doc.id === documentId);
    if (doc) {
      // Log document details to help debug URL issues
      console.log("Document details found:", {
        id: doc.id,
        name: doc.name,
        original_url: doc.original_url,
        url: doc.url,
        status: doc.status,
        thumbnails: doc.thumbnails?.length || 0
      });
    }
    return doc;
  }, [documents, documentId]);

  // Function to update document URLs if they're missing
  const validateDocumentUrls = React.useCallback(async () => {
    if (!document || !documentId) return;
    
    // If both URLs are missing, try to update them
    if (!document.original_url && !document.url) {
      try {
        console.log("Attempting to fix missing document URLs for:", documentId);
        
        // Try with document id path (newer format)
        if (document.userId) {
          const pathWithId = `${document.userId}/${document.id}/original${document.type === 'pdf' ? '.pdf' : ''}`;
          const { data: urlWithId } = supabase.storage
            .from("document_files")
            .getPublicUrl(pathWithId);
            
          if (urlWithId?.publicUrl) {
            console.log("Found URL with document ID path:", urlWithId.publicUrl);
            
            // Update the document record with the correct URL
            await supabase
              .from("documents")
              .update({ 
                original_url: urlWithId.publicUrl,
                url: urlWithId.publicUrl 
              })
              .eq("id", document.id);
              
            // Refresh documents to get updated URLs
            fetchUserDocuments();
            return;
          }
          
          // Try with uploads path (older format)
          const filename = encodeURIComponent(document.name);
          const pathWithName = `${document.userId}/uploads/${filename}`;
          const { data: urlWithName } = supabase.storage
            .from("document_files")
            .getPublicUrl(pathWithName);
            
          if (urlWithName?.publicUrl) {
            console.log("Found URL with uploads path:", urlWithName.publicUrl);
            
            // Update the document record with the correct URL
            await supabase
              .from("documents")
              .update({ 
                original_url: urlWithName.publicUrl,
                url: urlWithName.publicUrl
              })
              .eq("id", document.id);
              
            // Refresh documents to get updated URLs
            fetchUserDocuments();
          }
        }
      } catch (error) {
        console.error("Error fixing document URLs:", error);
      }
    }
  }, [document, documentId, fetchUserDocuments]);

  React.useEffect(() => {
    const loadDocumentData = async () => {
      try {
        if (!documentId) return;
        
        // Set a maximum timeout for loading documents
        const timeout = setTimeout(() => {
          if (!documentLoaded) {
            setIsLoading(false);
            toast({
              title: "Loading timeout",
              description: "Document loading took too long. Please refresh to try again.",
              variant: "destructive"
            });
          }
        }, 10000); // 10 second timeout
        
        await fetchUserDocuments();
        setDocumentLoaded(true);
        
        // If document URLs are missing, try to fix them
        await validateDocumentUrls();
        
        await fetchLogs(documentId);
        clearTimeout(timeout);
      } catch (error) {
        console.error("Error loading document data:", error);
        toast({
          title: "Error",
          description: "Failed to load document data",
          variant: "destructive"
        });
      }
    };
    
    loadDocumentData();
  }, [documentId, fetchUserDocuments, validateDocumentUrls]);

  const fetchLogs = async (docId: string) => {
    setLogsLoading(true);
    try {
      const documentLogs = await getProcessingLogs(docId);
      setLogs(documentLogs);
    } catch (error) {
      console.error("Error fetching document logs:", error);
      toast({
        title: "Error",
        description: "Failed to load document processing logs",
        variant: "destructive"
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/documents");
  };

  // Custom loading state - prevent infinite loading
  const [isLoadingInternal, setIsLoading] = React.useState(true);
  
  React.useEffect(() => {
    // Set timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // 5 second max loading time
    
    if (!isLoading && document) {
      setIsLoading(false);
      clearTimeout(timeout);
    }
    
    return () => clearTimeout(timeout);
  }, [isLoading, document]);

  if (isLoadingInternal) {
    return (
      <div className="container py-10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container py-10">
        <Button variant="outline" onClick={handleBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
        </Button>
        
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <h2 className="text-xl font-semibold mb-2">Document Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The document you're looking for could not be found or you may not have access to it.
          </p>
          <Button onClick={handleBack}>Go Back to Documents</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Button variant="outline" onClick={handleBack} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
      </Button>
      
      <h1 className="text-2xl font-bold mb-6 text-center md:text-left">
        {document.name}
      </h1>
      
      <DocumentDetail document={document} logs={logs} />
    </div>
  );
}
