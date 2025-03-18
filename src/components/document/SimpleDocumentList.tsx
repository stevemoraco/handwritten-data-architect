
import * as React from "react";
import { Document } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, FileIcon, UploadIcon, ExternalLink, AlertTriangle, Clock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "@/context/DocumentContext";
import { toast } from "@/hooks/use-toast";

interface SimpleDocumentListProps {
  documents: Document[];
  isLoading: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function SimpleDocumentList({
  documents,
  isLoading,
  selectedIds,
  onSelectionChange
}: SimpleDocumentListProps) {
  const navigate = useNavigate();
  const { fetchError, fetchUserDocuments, convertPdfToImages } = useDocuments();
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [processingIds, setProcessingIds] = React.useState<string[]>([]);
  
  const handleToggleDocument = (documentId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, documentId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== documentId));
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(documents.map(doc => doc.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await fetchUserDocuments();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleViewDocument = (documentId: string) => {
    navigate(`/document/${documentId}`);
  };
  
  const handleGenerateThumbnails = async (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (processingIds.includes(documentId)) return;
    
    setProcessingIds(prev => [...prev, documentId]);
    
    try {
      await convertPdfToImages(documentId);
      toast({
        title: "Processing started",
        description: "Document thumbnails are being generated. This may take a moment.",
      });
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchUserDocuments();
      }, 2000);
    } catch (error) {
      console.error("Error generating thumbnails:", error);
      toast({
        title: "Error",
        description: "Failed to generate thumbnails. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== documentId));
    }
  };

  const allSelected = documents.length > 0 && selectedIds.length === documents.length;
  
  // Helper function to check if thumbnails exist
  const hasThumbnails = (doc: Document) => {
    return Array.isArray(doc.thumbnails) && doc.thumbnails.length > 0 && doc.thumbnails[0] !== null;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <Check className="h-3 w-3" />;
      case 'processing':
        return <Clock className="h-3 w-3" />;
      case 'failed':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <UploadIcon className="h-3 w-3" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            {fetchError ? (
              <div className="flex flex-col items-center gap-2">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="text-destructive">Could not load documents</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <FileIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No documents found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload documents to get started.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Your Documents</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Refresh
                </>
              )}
            </Button>
            <Checkbox 
              id="select-all" 
              checked={allSelected}
              onCheckedChange={handleToggleAll} 
            />
            <label 
              htmlFor="select-all" 
              className="text-sm cursor-pointer"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </label>
          </div>
        </div>

        <div className="space-y-2">
          {documents.map((document) => (
            <div 
              key={document.id} 
              className={cn(
                "flex items-start gap-3 p-3 rounded-md",
                selectedIds.includes(document.id)
                  ? "bg-primary/10"
                  : "hover:bg-muted/50 transition-colors"
              )}
            >
              <Checkbox 
                id={`doc-${document.id}`}
                checked={selectedIds.includes(document.id)} 
                onCheckedChange={(checked) => handleToggleDocument(document.id, !!checked)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <label 
                    htmlFor={`doc-${document.id}`}
                    className="font-medium text-sm cursor-pointer truncate"
                  >
                    {document.name}
                  </label>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs font-normal py-0 h-5 gap-1",
                        getStatusColor(document.status)
                      )}
                    >
                      {getStatusIcon(document.status)}
                      {document.status}
                    </Badge>
                    
                    {document.original_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        title="View original document"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(document.original_url, '_blank');
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{document.type.toUpperCase()}</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50"></span>
                  <span>{document.pageCount || 0} pages</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50"></span>
                  <span>{document.createdAt ? formatDistanceToNow(new Date(document.createdAt), { addSuffix: true }) : 'Unknown date'}</span>
                </div>
                
                {document.status === 'failed' && document.processing_error && (
                  <div className="mt-1 text-xs text-destructive">
                    Error: {document.processing_error}
                  </div>
                )}
                
                {hasThumbnails(document) ? (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                    {document.thumbnails.slice(0, 3).map((thumbnail, index) => (
                      <div key={index} className="shrink-0 w-16 h-20 border rounded-sm overflow-hidden">
                        <img 
                          src={thumbnail} 
                          alt={`Page ${index + 1}`} 
                          className="w-full h-full object-cover"
                          onClick={() => handleViewDocument(document.id)}
                          onError={(e) => {
                            console.log(`Thumbnail failed to load: ${thumbnail}`);
                            (e.target as HTMLImageElement).src = `/placeholder.svg`;
                          }}
                        />
                      </div>
                    ))}
                    {document.thumbnails.length > 3 && (
                      <div 
                        className="shrink-0 w-16 h-20 flex items-center justify-center border rounded-sm bg-muted/50 cursor-pointer"
                        onClick={() => handleViewDocument(document.id)}
                      >
                        <span className="text-xs text-muted-foreground">+{document.thumbnails.length - 3} more</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs px-2 text-primary"
                      onClick={(e) => handleGenerateThumbnails(document.id, e)}
                      disabled={processingIds.includes(document.id) || document.status === "processing"}
                    >
                      {processingIds.includes(document.id) || document.status === "processing" ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>Generate thumbnails</>
                      )}
                    </Button>
                  </div>
                )}
                
                <div className="mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs px-2 text-primary"
                    onClick={() => handleViewDocument(document.id)}
                  >
                    View details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
