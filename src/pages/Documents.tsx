
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { DocumentCard } from "@/components/document/DocumentCard";
import { Button } from "@/components/ui/button";
import { PlusIcon, FolderIcon, ArrowUpIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function Documents() {
  const navigate = useNavigate();
  const { documents, isLoading, fetchUserDocuments } = useDocuments();
  const [filter, setFilter] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    fetchUserDocuments();
  }, [fetchUserDocuments]);

  const filteredDocuments = React.useMemo(() => {
    return documents
      .filter(doc => {
        // Apply status filter
        if (filter !== "all" && doc.status !== filter) {
          return false;
        }
        
        // Apply search filter if there's a search term
        if (searchTerm && !doc.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, filter, searchTerm]);

  const handleViewDocument = (documentId: string) => {
    navigate(`/document/${documentId}`);
  };

  const handleProcessDocument = (documentId: string) => {
    navigate(`/process`, { state: { documentIds: [documentId] } });
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      // This would be replaced with actual delete logic
      toast({
        title: "Document deleted",
        description: "Document has been successfully deleted."
      });
      await fetchUserDocuments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive"
      });
    }
  };

  const documentTypeCount = React.useMemo(() => {
    return {
      all: documents.length,
      processing: documents.filter(doc => doc.status === "processing").length,
      processed: documents.filter(doc => doc.status === "processed").length,
      failed: documents.filter(doc => doc.status === "failed").length
    };
  }, [documents]);

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/upload')} className="gap-2">
            <PlusIcon className="h-4 w-4" /> Upload Documents
          </Button>
          <Button onClick={() => navigate('/process')} variant="outline" className="gap-2">
            <ArrowUpIcon className="h-4 w-4" /> Process Documents
          </Button>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between mb-6">
        <div className="w-full md:w-64">
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents ({documentTypeCount.all})</SelectItem>
            <SelectItem value="processing">Processing ({documentTypeCount.processing})</SelectItem>
            <SelectItem value="processed">Processed ({documentTypeCount.processed})</SelectItem>
            <SelectItem value="failed">Failed ({documentTypeCount.failed})</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="ml-4 text-muted-foreground">Loading documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <FolderIcon className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No documents found</h3>
          <p className="text-muted-foreground mt-1">
            {searchTerm || filter !== "all" 
              ? "Try changing your search or filter criteria" 
              : "Upload a document to get started"}
          </p>
          {(!searchTerm && filter === "all") && (
            <Button 
              onClick={() => navigate('/upload')} 
              variant="outline" 
              className="mt-4"
            >
              Upload a document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onView={() => handleViewDocument(document.id)}
              onProcess={() => handleProcessDocument(document.id)}
              onDelete={() => handleDeleteDocument(document.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
