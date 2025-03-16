
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { Button } from "@/components/ui/button";
import { PlusIcon, ArrowUpIcon, Trash2, RefreshCw } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Documents() {
  const navigate = useNavigate();
  const { documents, isLoading, removeBatchDocuments, fetchUserDocuments } = useDocuments();
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

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
      toast({
        title: "Error",
        description: "An error occurred while deleting documents",
        variant: "destructive"
      });
    }
  };

  const handleUploadDocuments = () => {
    // Navigate to the dashboard with the upload tab active
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

  // Function to fix missing document URLs
  const handleFixDocumentUrls = async () => {
    setIsRefreshing(true);
    try {
      // For each document without URLs, try to reconstruct them
      const promises = documents.filter(doc => !doc.original_url || !doc.url).map(async (doc) => {
        // Try with document id path (newer format)
        if (doc.userId) {
          const pathWithId = `${doc.userId}/${doc.id}/original${doc.type === 'pdf' ? '.pdf' : ''}`;
          const { data: urlWithId } = supabase.storage
            .from("document_files")
            .getPublicUrl(pathWithId);
            
          if (urlWithId?.publicUrl) {
            // Update the document record with the correct URL
            return supabase
              .from("documents")
              .update({ 
                original_url: urlWithId.publicUrl,
                url: urlWithId.publicUrl 
              })
              .eq("id", doc.id);
          }
          
          // Try with uploads path (older format)
          const filename = encodeURIComponent(doc.name);
          const pathWithName = `${doc.userId}/uploads/${filename}`;
          const { data: urlWithName } = supabase.storage
            .from("document_files")
            .getPublicUrl(pathWithName);
            
          if (urlWithName?.publicUrl) {
            // Update the document record with the correct URL
            return supabase
              .from("documents")
              .update({ 
                original_url: urlWithName.publicUrl,
                url: urlWithName.publicUrl
              })
              .eq("id", doc.id);
          }
        }
        return null;
      });
      
      await Promise.all(promises);
      await fetchUserDocuments();
      
      toast({
        title: "URL references fixed",
        description: "Document URLs have been updated",
      });
    } catch (error) {
      console.error("Error fixing document URLs:", error);
      toast({
        title: "Error",
        description: "Could not fix document URLs",
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
      
      {/* Debug tool - only visible in development */}
      {import.meta.env.DEV && (
        <div className="mt-8 border border-dashed p-4 rounded-md">
          <h3 className="text-sm font-medium mb-2">Developer Tools</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleFixDocumentUrls}
            disabled={isRefreshing}
            className="text-xs"
          >
            Fix Document URLs
          </Button>
          
          <div className="mt-4 overflow-auto max-h-40 text-xs">
            <p className="font-medium mb-1">Documents with missing URLs:</p>
            <ul className="space-y-1">
              {documents.filter(doc => !doc.original_url || !doc.url).map(doc => (
                <li key={doc.id} className="text-muted-foreground">
                  {doc.name} - ID: {doc.id}
                </li>
              ))}
              {documents.filter(doc => !doc.original_url || !doc.url).length === 0 && (
                <li className="text-green-600">All documents have URLs</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
