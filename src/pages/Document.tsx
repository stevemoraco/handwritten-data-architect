
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle, ArrowUpIcon, FileText } from "lucide-react";
import { getProcessingLogs } from "@/services/documentService";
import { ProcessingLog } from "@/types";
import { toast } from "@/hooks/use-toast";
import { DocumentDetail } from "@/components/document/DocumentDetail";
import { Card } from "@/components/ui/card";

export default function Document() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { documents, fetchUserDocuments, isLoading, fetchError } = useDocuments();
  const [logs, setLogs] = React.useState<ProcessingLog[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(true);
  const [logsError, setLogsError] = React.useState<string | null>(null);
  const [errorShown, setErrorShown] = React.useState(false);

  const document = React.useMemo(() => {
    return documents.find(doc => doc.id === documentId);
  }, [documents, documentId]);

  React.useEffect(() => {
    const loadDocumentData = async () => {
      try {
        if (!documentId) return;
        
        if (documents.length === 0) {
          await fetchUserDocuments();
        }
        
        await fetchLogs(documentId);
      } catch (error) {
        console.error("Error loading document data:", error);
        if (!errorShown) {
          toast({
            title: "Error",
            description: "Failed to load document data",
            variant: "destructive"
          });
          setErrorShown(true);
        }
      }
    };
    
    loadDocumentData();
  }, [documentId, fetchUserDocuments, documents.length, errorShown]);

  // Show fetch error only once
  React.useEffect(() => {
    if (fetchError && !errorShown) {
      toast({
        title: "Connection error",
        description: "Unable to load document details. Please try again later.",
        variant: "destructive"
      });
      setErrorShown(true);
    }
  }, [fetchError, errorShown]);

  const fetchLogs = async (docId: string) => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const documentLogs = await getProcessingLogs(docId);
      setLogs(documentLogs);
    } catch (error) {
      console.error("Error fetching document logs:", error);
      setLogsError("Failed to load processing logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRetryFetch = async () => {
    setErrorShown(false);
    await fetchUserDocuments();
    if (documentId) {
      await fetchLogs(documentId);
    }
  };

  const handleBack = () => {
    navigate("/documents");
  };
  
  const handleProcess = () => {
    if (documentId) {
      navigate(`/process?documentId=${documentId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading document...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="container py-10">
        <Button variant="outline" onClick={handleBack} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
        </Button>
        
        <Card className="mb-6 p-6 bg-destructive/10 border-destructive/20">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-xl font-medium text-destructive">Connection Error</h3>
              <p className="text-sm mb-4">Could not connect to the server to load document details.</p>
              <Button 
                onClick={handleRetryFetch}
                variant="outline"
              >
                Retry Connection
              </Button>
            </div>
          </div>
        </Card>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Documents
        </Button>
        
        <Button onClick={handleProcess}>
          <ArrowUpIcon className="h-4 w-4 mr-2" /> Process Document
        </Button>
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-center md:text-left">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {document.name}
        </div>
      </h1>
      
      {logsError && (
        <Card className="mb-6 p-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="text-sm">Failed to load processing logs. Document details may be incomplete.</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-auto text-amber-600 border-amber-300 hover:bg-amber-50"
              onClick={() => documentId && fetchLogs(documentId)}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}
      
      <DocumentDetail document={document} logs={logs} />
    </div>
  );
}
