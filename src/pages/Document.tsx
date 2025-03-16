
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { DocumentDetail } from "@/components/document/DocumentDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getProcessingLogs } from "@/services/documentService";
import { ProcessingLog } from "@/types";
import { toast } from "@/hooks/use-toast";

export default function Document() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { documents, fetchUserDocuments, isLoading } = useDocuments();
  const [logs, setLogs] = React.useState<ProcessingLog[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(true);
  const [documentLoaded, setDocumentLoaded] = React.useState(false);

  const document = React.useMemo(() => {
    return documents.find(doc => doc.id === documentId);
  }, [documents, documentId]);

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
  }, [documentId]);

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

  // Add more detailed logging to check document object structure
  React.useEffect(() => {
    if (document) {
      console.log("Document details for view:", {
        id: document.id,
        name: document.name,
        original_url: document.original_url,
        url: document.url,
        status: document.status,
        thumbnails: document.thumbnails?.length || 0
      });
    }
  }, [document]);

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
