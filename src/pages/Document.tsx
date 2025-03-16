
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { DocumentDetail } from "@/components/document/DocumentDetail";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getProcessingLogs } from "@/services/documentService";
import { ProcessingLog } from "@/types";
import { toast } from "@/components/ui/use-toast";

export default function Document() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const { documents, fetchUserDocuments, isLoading } = useDocuments();
  const [logs, setLogs] = React.useState<ProcessingLog[]>([]);
  const [logsLoading, setLogsLoading] = React.useState(true);

  const document = React.useMemo(() => {
    return documents.find(doc => doc.id === documentId);
  }, [documents, documentId]);

  React.useEffect(() => {
    fetchUserDocuments();
    
    if (documentId) {
      fetchLogs(documentId);
    }
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
