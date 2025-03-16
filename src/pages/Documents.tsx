
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArrowUpIcon, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { BatchDocumentsSelector } from "@/components/document/BatchDocumentsSelector";
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

export default function Documents() {
  const navigate = useNavigate();
  const { documents, isLoading, removeBatchDocuments } = useDocuments();
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  // Using a ref to track if we've already fetched documents
  const fetchedRef = React.useRef(false);

  // We'll only fetch documents once when the component mounts
  React.useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
    }
  }, []);

  const handleProcessSelected = () => {
    if (selectedDocumentIds.length === 0) return;
    
    // Navigate to the process page with selected document IDs in the state to prevent URL length limitations
    navigate('/process', { state: { documentIds: selectedDocumentIds } });
  };

  const handleDeleteSelected = async () => {
    if (selectedDocumentIds.length === 0) return;
    
    try {
      setDeleteDialogOpen(false);
      await removeBatchDocuments(selectedDocumentIds);
      setSelectedDocumentIds([]);
    } catch (error) {
      console.error("Error deleting documents:", error);
    }
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/')} className="gap-2">
            <PlusIcon className="h-4 w-4" /> Upload Documents
          </Button>
          <Button 
            onClick={handleProcessSelected} 
            variant="outline" 
            className="gap-2"
            disabled={selectedDocumentIds.length === 0}
          >
            <ArrowUpIcon className="h-4 w-4" /> Process Selected
          </Button>
          {selectedDocumentIds.length > 0 && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" /> Delete Selected
            </Button>
          )}
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <BatchDocumentsSelector 
        onSelectionChange={setSelectedDocumentIds}
      />
      
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
