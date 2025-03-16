
import * as React from "react";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DocumentCard } from "@/components/document/DocumentCard";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BatchDocumentsSelectorProps {
  onSelectionChange?: (selectedIds: string[]) => void;
}

export function BatchDocumentsSelector({
  onSelectionChange,
}: BatchDocumentsSelectorProps) {
  const { documents, isLoading, removeBatchDocuments } = useDocuments();
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedDocumentIds);
    }
  }, [selectedDocumentIds, onSelectionChange]);

  const toggleDocumentSelection = (documentId: string) => {
    setSelectedDocumentIds(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const selectAll = () => {
    setSelectedDocumentIds(documents.map(doc => doc.id));
  };

  const deselectAll = () => {
    setSelectedDocumentIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedDocumentIds.length === 0) return;
    
    try {
      setDeleteDialogOpen(false);
      await removeBatchDocuments(selectedDocumentIds);
      setSelectedDocumentIds([]);
    } catch (error) {
      console.error("Error deleting documents:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete documents",
        variant: "destructive",
      });
    }
  };

  const viewDocument = (documentId: string) => {
    navigate(`/document/${documentId}`);
  };

  const processDocument = (documentId: string) => {
    navigate('/process', { state: { documentIds: [documentId] } });
  };

  const handleUploadDocuments = () => {
    // Navigate to the dashboard with the upload tab active
    navigate('/?tab=upload');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/10">
        <h3 className="text-lg font-medium mb-2">No documents found</h3>
        <p className="text-muted-foreground mb-4">Upload documents to get started</p>
        <Button onClick={handleUploadDocuments}>Upload Documents</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={selectAll}
            disabled={documents.length === selectedDocumentIds.length}
          >
            Select All
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={deselectAll}
            disabled={selectedDocumentIds.length === 0}
          >
            Deselect All
          </Button>
          
          {selectedDocumentIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedDocumentIds.length})
            </Button>
          )}
        </div>
        
        <p className="text-sm text-muted-foreground">
          {selectedDocumentIds.length} of {documents.length} selected
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((document) => (
          <DocumentCard 
            key={document.id}
            document={document}
            onView={() => viewDocument(document.id)}
            onProcess={() => processDocument(document.id)}
            isSelected={selectedDocumentIds.includes(document.id)}
            onToggleSelect={() => toggleDocumentSelection(document.id)}
          />
        ))}
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedDocumentIds.length} document(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
