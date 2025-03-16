
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArrowUpIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { BatchDocumentsSelector } from "@/components/document/BatchDocumentsSelector";

export default function Documents() {
  const navigate = useNavigate();
  const { fetchUserDocuments } = useDocuments();
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    fetchUserDocuments();
  }, [fetchUserDocuments]);

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/upload')} className="gap-2">
            <PlusIcon className="h-4 w-4" /> Upload Documents
          </Button>
          <Button 
            onClick={() => navigate('/process')} 
            variant="outline" 
            className="gap-2"
            disabled={selectedDocumentIds.length === 0}
          >
            <ArrowUpIcon className="h-4 w-4" /> Process Selected
          </Button>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <BatchDocumentsSelector 
        onSelectionChange={setSelectedDocumentIds}
      />
    </div>
  );
}
