
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArrowUpIcon, Trash2, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SimpleDocumentList } from "@/components/document/SimpleDocumentList";
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
import { toast } from "@/hooks/use-toast";

export default function Documents() {
  const navigate = useNavigate();
  const { documents, isLoading, removeBatchDocuments, fetchUserDocuments } = useDocuments();
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    fetchUserDocuments();
  }, [fetchUserDocuments]);

  const handleProcessSelected = () => {
    if (selectedDocumentIds.length === 0) return;
    navigate('/process', { state: { documentIds: selectedDocumentIds } });
  };

  const handleDeleteSelected = async () => {
    if (selectedDocumentIds.length === 0) return;
    
    try {
      setDeleteDialogOpen(false);
      await removeBatchDocuments(selectedDocumentIds);
      setSelectedDocumentIds([]);
      toast({
        title: "Documents deleted",
        description: `Successfully deleted ${selectedDocumentIds.length} document(s)`,
      });
    } catch (error) {
      console.error("Error deleting documents:", error);
      toast({
        title: "Error",
        description: "An error occurred while deleting documents",
        variant: "destructive"
      });
    }
  };

  const handleUploadDocuments = () => {
    navigate('/?tab=upload');
  };

  const handleRefreshDocuments = async () => {
    setIsRefreshing(true);
    try {
      await fetchUserDocuments();
      toast({
        title: "Documents refreshed",
        description: "Your document list has been updated",
      });
    } catch (error) {
      console.error("Error refreshing documents:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh document list",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button onClick={handleUploadDocuments} className="gap-2">
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
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefreshDocuments}
            disabled={isRefreshing}
            title="Refresh documents"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
      
      <SimpleDocumentList 
        documents={documents}
        isLoading={isLoading}
        selectedIds={selectedDocumentIds}
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
